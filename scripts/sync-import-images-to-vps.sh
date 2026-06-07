#!/usr/bin/env bash
# Upload mirrored import images (Facebook + WooCommerce) from local public/images/imports
# to the VPS. This is a one-time FILE COPY — not a re-import from WooCommerce/Facebook.
#
#   npm run images:sync-to-vps
#   npm run images:sync-to-vps -- --dry-run
#
# Env (same as db:tunnel):
#   VPS_HOST=superclones.cloud  SSH_USER=root
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
VPS_HOST="${VPS_HOST:-superclones.cloud}"
SSH_USER="${SSH_USER:-root}"
SSH_PORT="${VPS_SSH_PORT:-${SSH_PORT:-22}}"
REMOTE_IMAGES="${REMOTE_CATALOG_IMAGES:-/home/superclones.cloud/public_html/images/imports}"
LOCAL_IMPORTS="${APP_DIR}/public/images/imports"
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
  esac
done

if [[ ! -d "$LOCAL_IMPORTS" ]]; then
  echo "ERROR: Local import images not found: $LOCAL_IMPORTS"
  echo "Run import/mirror scripts locally first (npm run db:mirror-woocommerce-images, etc.)."
  exit 1
fi

LOCAL_COUNT=$(find "$LOCAL_IMPORTS" -type f 2>/dev/null | wc -l | tr -d ' ')
echo "==> Sync import images to VPS"
echo "    local:  $LOCAL_IMPORTS ($LOCAL_COUNT files)"
echo "    remote: ${SSH_USER}@${VPS_HOST}:${REMOTE_IMAGES}/"

RSYNC_FLAGS=(-avz --progress)
if [[ "$DRY_RUN" == true ]]; then
  RSYNC_FLAGS+=(--dry-run)
fi

if [[ -n "${VPS_SSH_KEY:-}" && -f "${VPS_SSH_KEY}" ]]; then
  RSYNC_FLAGS+=(-e "ssh -i ${VPS_SSH_KEY} -p ${SSH_PORT} -o StrictHostKeyChecking=accept-new")
elif [[ -f "${HOME}/.ssh/id_ed25519" ]]; then
  RSYNC_FLAGS+=(-e "ssh -p ${SSH_PORT} -o StrictHostKeyChecking=accept-new")
fi

rsync "${RSYNC_FLAGS[@]}" \
  "${LOCAL_IMPORTS}/" \
  "${SSH_USER}@${VPS_HOST}:${REMOTE_IMAGES}/"

if [[ "$DRY_RUN" == true ]]; then
  echo "Dry-run complete — no files copied."
  exit 0
fi

echo "==> Fix permissions on VPS (best effort)"
ssh -p "$SSH_PORT" "${SSH_USER}@${VPS_HOST}" \
  "chown -R superclones.cloud:superclones.cloud '${REMOTE_IMAGES}' 2>/dev/null || chown -R www-data:www-data '${REMOTE_IMAGES}' 2>/dev/null || true"

echo "==> Verify sample image"
SAMPLE=$(find "$LOCAL_IMPORTS/woocommerce" -name '001.jpg' 2>/dev/null | head -1 || true)
if [[ -n "$SAMPLE" ]]; then
  REL="${SAMPLE#${APP_DIR}/public}"
  curl -sI "https://superclones.cloud${REL}" | head -3 || true
fi

echo "OK: import images synced to VPS"
