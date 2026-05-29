#!/usr/bin/env bash
# One-time VPS bootstrap (run as root).
# Usage: sudo bash scripts/vps-first-setup.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/superclones.cloud}"
REPO_URL="${REPO_URL:-https://github.com/Sima-ae/catalogus.git}"

if [[ "$(id -un)" != "root" ]]; then
  echo "ERROR: run as root: sudo bash scripts/vps-first-setup.sh"
  exit 1
fi

echo "==> Install Node.js 20 (if missing)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs git
fi

git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

echo "==> Clone or update repository at $APP_DIR"
PARENT_DIR="$(dirname "$APP_DIR")"
mkdir -p "$PARENT_DIR"

if [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR"
  git fetch origin main
  git reset --hard origin/main
elif [[ ! -d "$APP_DIR" ]] || [[ -z "$(ls -A "$APP_DIR" 2>/dev/null)" ]]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "==> Directory exists without git — run scripts/vps-recover.sh or re-clone"
  ENV_BAK=""
  [[ -f "$APP_DIR/.env" ]] && ENV_BAK="$(mktemp)" && cp "$APP_DIR/.env" "$ENV_BAK"
  NAME="$(basename "$APP_DIR")"
  cd "$PARENT_DIR"
  mv "$NAME" "${NAME}.bak.$(date +%s)"
  git clone "$REPO_URL" "$NAME"
  [[ -n "$ENV_BAK" ]] && cp "$ENV_BAK" "$APP_DIR/.env"
fi

echo "==> Environment file"
if [[ ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/.env.vps.example" "$APP_DIR/.env"
  echo "EDIT $APP_DIR/.env with database password and Stripe keys, then re-run deploy."
fi

echo "==> Install systemd unit (runs as root)"
systemctl unmask catalogus 2>/dev/null || true
if [[ ! -f "$APP_DIR/deploy/catalogus.service" ]]; then
  echo "ERROR: $APP_DIR/deploy/catalogus.service not found — git clone incomplete"
  exit 1
fi
sed "s|/var/www/superclones.cloud|$APP_DIR|g" \
  "$APP_DIR/deploy/catalogus.service" > /etc/systemd/system/catalogus.service
systemctl daemon-reload
systemctl enable catalogus

echo ""
echo "Next steps:"
echo "  1. Edit $APP_DIR/.env (DATABASE_URL, Stripe, AUTH_DEV_FALLBACK=false)"
echo "  2. Add GitHub Actions SSH public key to /root/.ssh/authorized_keys"
echo "  3. GitHub secrets: VPS_HOST, VPS_USER=root, VPS_SSH_KEY, VPS_APP_PATH=$APP_DIR"
echo "  4. Run: bash $APP_DIR/scripts/deploy.sh"
echo "  5. Configure LiteSpeed/nginx: $APP_DIR/deploy/htaccess.example"
