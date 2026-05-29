#!/usr/bin/env bash
# Ensure deploy user can read CyberPanel product images + CATALOGUS_PUBLIC_HTML in .env
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PUBLIC_HTML="${CATALOGUS_PUBLIC_HTML:-/home/superclones.cloud/public_html}"
IMAGES_SRC="${PUBLIC_HTML}/images"
DEPLOY_USER="${CATALOGUS_DEPLOY_USER:-deploy}"
ENV_FILE="${APP_DIR}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "WARN: no .env at $ENV_FILE"
  exit 0
fi

if ! grep -qE '^CATALOGUS_PUBLIC_HTML=' "$ENV_FILE" 2>/dev/null; then
  echo "CATALOGUS_PUBLIC_HTML=${PUBLIC_HTML}" >> "$ENV_FILE"
  echo "==> Added CATALOGUS_PUBLIC_HTML to .env"
else
  echo "OK: CATALOGUS_PUBLIC_HTML already in .env"
fi

if [[ ! -d "$IMAGES_SRC" ]]; then
  echo "WARN: images directory not found: $IMAGES_SRC"
  exit 0
fi

# deploy must traverse /home/<user>/public_html (often missing o+x for "other")
HOME_DIR="$(dirname "$PUBLIC_HTML")"
for d in "$HOME_DIR" "$PUBLIC_HTML"; do
  if [[ -d "$d" ]]; then
    chmod o+x "$d" 2>/dev/null || true
  fi
done

chmod -R a+rX "$IMAGES_SRC" 2>/dev/null || true

if id "$DEPLOY_USER" &>/dev/null; then
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$IMAGES_SRC" 2>/dev/null || \
    echo "WARN: could not chown $IMAGES_SRC to $DEPLOY_USER (fix manually)"
fi

if sudo -u "$DEPLOY_USER" test -r "${IMAGES_SRC}/HORLOGES" 2>/dev/null; then
  echo "OK: $DEPLOY_USER can read $IMAGES_SRC"
else
  sample="$(find "$IMAGES_SRC" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) 2>/dev/null | head -1)"
  if [[ -n "$sample" ]] && sudo -u "$DEPLOY_USER" test -r "$sample"; then
    echo "OK: $DEPLOY_USER can read files under $IMAGES_SRC"
  else
    echo "WARN: $DEPLOY_USER still cannot read $IMAGES_SRC — run:"
    echo "  chmod o+x $HOME_DIR $PUBLIC_HTML && chown -R $DEPLOY_USER:$DEPLOY_USER $IMAGES_SRC"
  fi
fi
