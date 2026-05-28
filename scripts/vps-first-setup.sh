#!/usr/bin/env bash
# One-time VPS bootstrap (run as root or with sudo).
# Usage: sudo bash scripts/vps-first-setup.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/superclones.cloud}"
REPO_URL="${REPO_URL:-https://github.com/Sima-ae/catalogus.git}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"

echo "==> Install Node.js 20 (if missing)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs git
fi

echo "==> Create deploy user"
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
fi

echo "==> Clone or update repository at $APP_DIR"
PARENT_DIR="$(dirname "$APP_DIR")"
mkdir -p "$PARENT_DIR"
chown "$DEPLOY_USER:$DEPLOY_USER" "$PARENT_DIR"
sudo -u "$DEPLOY_USER" git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

if [[ -d "$APP_DIR/.git" ]]; then
  sudo -u "$DEPLOY_USER" bash -c "cd $(printf '%q' "$APP_DIR") && git fetch origin main && git reset --hard origin/main"
elif [[ ! -d "$APP_DIR" ]] || [[ -z "$(ls -A "$APP_DIR" 2>/dev/null)" ]]; then
  mkdir -p "$APP_DIR"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
  sudo -u "$DEPLOY_USER" git clone "$REPO_URL" "$APP_DIR"
else
  echo "==> Directory exists without git — run scripts/vps-recover.sh or re-clone"
  sudo -u "$DEPLOY_USER" bash -c "
    set -euo pipefail
    APP_DIR=$(printf '%q' "$APP_DIR")
    REPO_URL=$(printf '%q' "$REPO_URL")
    ENV_BAK=''
    [[ -f \"\$APP_DIR/.env\" ]] && ENV_BAK=\$(mktemp) && cp \"\$APP_DIR/.env\" \"\$ENV_BAK\"
    PARENT=\$(dirname \"\$APP_DIR\")
    NAME=\$(basename \"\$APP_DIR\")
    cd \"\$PARENT\"
    mv \"\$NAME\" \"\${NAME}.bak.\$(date +%s)\"
    git clone \"\$REPO_URL\" \"\$NAME\"
    [[ -n \"\$ENV_BAK\" ]] && cp \"\$ENV_BAK\" \"\$APP_DIR/.env\"
  "
fi
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

echo "==> Environment file"
if [[ ! -f "$APP_DIR/.env" ]]; then
  sudo -u "$DEPLOY_USER" cp "$APP_DIR/.env.vps.example" "$APP_DIR/.env"
  echo "EDIT $APP_DIR/.env with database password and Stripe keys, then re-run deploy."
fi

echo "==> Allow deploy user to restart catalogus without password"
cat > /etc/sudoers.d/catalogus-deploy <<EOF
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart catalogus, /bin/systemctl start catalogus, /bin/systemctl stop catalogus, /bin/systemctl status catalogus
EOF
chmod 440 /etc/sudoers.d/catalogus-deploy

echo "==> Install systemd unit"
systemctl unmask catalogus 2>/dev/null || true
if [[ ! -f "$APP_DIR/deploy/catalogus.service" ]]; then
  echo "ERROR: $APP_DIR/deploy/catalogus.service not found — git clone incomplete"
  exit 1
fi
sed "s|/var/www/superclones.cloud|$APP_DIR|g; s|^User=deploy|User=$DEPLOY_USER|" \
  "$APP_DIR/deploy/catalogus.service" > /etc/systemd/system/catalogus.service
systemctl daemon-reload
systemctl enable catalogus

echo ""
echo "Next steps:"
echo "  1. Edit $APP_DIR/.env (DATABASE_URL, Stripe, AUTH_DEV_FALLBACK=false)"
echo "  2. Add GitHub Actions deploy key to /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "  3. Set GitHub repo secrets: VPS_HOST, VPS_USER, VPS_SSH_KEY, VPS_APP_PATH=$APP_DIR"
echo "  4. Run: sudo -u $DEPLOY_USER bash $APP_DIR/scripts/deploy.sh"
echo "  5. Configure nginx: $APP_DIR/deploy/nginx-catalogus.conf.example"
