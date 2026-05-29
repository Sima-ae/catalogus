#!/usr/bin/env bash
# Recover a broken VPS deploy path (non-empty dir, no git, masked service, wrong layout).
# Run as root on the VPS:
#   curl -fsSL https://raw.githubusercontent.com/Sima-ae/catalogus/main/scripts/vps-recover.sh | sudo bash
# Or from a local clone:
#   sudo bash scripts/vps-recover.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/superclones.cloud}"
REPO_URL="${REPO_URL:-https://github.com/Sima-ae/catalogus.git}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
NESTED="${APP_DIR}/catalogus"

echo "=== Catalogus VPS recovery ==="
echo "APP_DIR=$APP_DIR"
echo ""

if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
fi

# Nested layout from old path: /var/www/superclones.cloud/catalogus → flatten to APP_DIR
if [[ -d "$NESTED" ]] && [[ "$NESTED" != "$APP_DIR" ]]; then
  echo "==> Found nested $NESTED — moving app files to $APP_DIR"
  mkdir -p "$APP_DIR"
  shopt -s dotglob
  for item in "$NESTED"/*; do
    base="$(basename "$item")"
    if [[ -e "$APP_DIR/$base" ]]; then
      echo "  skip existing: $base"
    else
      mv "$item" "$APP_DIR/"
    fi
  done
  shopt -u dotglob
  if [[ -d "$NESTED" ]]; then
    echo "  removing leftover nested tree: $NESTED"
    rm -rf "$NESTED"
  fi
fi

echo "==> Install Node.js 20 (if missing)"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs git
fi

echo "==> Fix ownership"
mkdir -p "$(dirname "$APP_DIR")"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR" 2>/dev/null || true
chown "$DEPLOY_USER:$DEPLOY_USER" "$(dirname "$APP_DIR")" 2>/dev/null || true

sudo -u "$DEPLOY_USER" git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

echo "==> Ensure git repository at $APP_DIR"
sudo -u "$DEPLOY_USER" bash <<RECOVER
set -euo pipefail
APP_DIR='$APP_DIR'
REPO_URL='$REPO_URL'
ENV_BAK=""

if [[ -f "\$APP_DIR/.env" ]]; then
  ENV_BAK="\$(mktemp)"
  cp "\$APP_DIR/.env" "\$ENV_BAK"
fi

if [[ -d "\$APP_DIR/.git" ]]; then
  echo "Git repo exists — updating from GitHub"
  cd "\$APP_DIR"
  git remote set-url origin "\$REPO_URL" 2>/dev/null || git remote add origin "\$REPO_URL"
  git fetch origin main
  git reset --hard origin/main
  git clean -fd
else
  if [[ -z "\$(ls -A "\$APP_DIR" 2>/dev/null)" ]]; then
    echo "Empty directory — cloning"
    git clone "\$REPO_URL" "\$APP_DIR"
  else
    echo "Non-empty directory without .git — backing up and re-cloning"
    PARENT="\$(dirname "\$APP_DIR")"
    NAME="\$(basename "\$APP_DIR")"
    cd "\$PARENT"
    mv "\$NAME" "\${NAME}.bak.\$(date +%s)"
    git clone "\$REPO_URL" "\$NAME"
  fi
fi

cd "\$APP_DIR"
if [[ -n "\$ENV_BAK" ]] && [[ -f "\$ENV_BAK" ]]; then
  cp "\$ENV_BAK" .env
  rm -f "\$ENV_BAK"
  echo "Restored .env"
elif [[ ! -f .env ]] && [[ -f .env.vps.example ]]; then
  cp .env.vps.example .env
  echo "Created .env from .env.vps.example — edit before production"
fi

echo "Commit: \$(git log -1 --oneline)"
RECOVER

chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

echo "==> systemd unit catalogus"
systemctl unmask catalogus 2>/dev/null || true
if [[ -f "$APP_DIR/deploy/catalogus.service" ]]; then
  sed "s|/var/www/superclones.cloud|$APP_DIR|g; s|^User=deploy|User=$DEPLOY_USER|" \
    "$APP_DIR/deploy/catalogus.service" > /etc/systemd/system/catalogus.service
  systemctl daemon-reload
  systemctl enable catalogus
  systemctl restart catalogus || systemctl start catalogus
  systemctl status catalogus --no-pager -l | head -15 || true
else
  echo "WARN: deploy/catalogus.service missing — git clone may have failed"
fi

echo ""
echo "=== Recovery done ==="
echo "  App path:  $APP_DIR"
echo "  GitHub secret VPS_APP_PATH=$APP_DIR"
echo "  Edit env:  nano $APP_DIR/.env"
echo "  Deploy:    sudo -u $DEPLOY_USER bash $APP_DIR/scripts/deploy.sh"
echo "  Nginx:     $APP_DIR/deploy/nginx-catalogus.conf.example"
