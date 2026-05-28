#!/usr/bin/env bash
# Copy LiteSpeed .htaccess into CyberPanel docRoot ($VH_ROOT/public_html).
# GitHub deploy updates /var/www/... only; this syncs the web-facing proxy rules.
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
if [[ -z "${CATALOGUS_PUBLIC_HTML:-}" && -f "$APP_DIR/.env" ]]; then
  line=$(grep -E '^CATALOGUS_PUBLIC_HTML=' "$APP_DIR/.env" | tail -1 || true)
  if [[ -n "$line" ]]; then
    CATALOGUS_PUBLIC_HTML="${line#*=}"
    CATALOGUS_PUBLIC_HTML="${CATALOGUS_PUBLIC_HTML%\"}"
    CATALOGUS_PUBLIC_HTML="${CATALOGUS_PUBLIC_HTML#\"}"
  fi
fi
PUBLIC_HTML="${CATALOGUS_PUBLIC_HTML:-/home/superclones.cloud/public_html}"
SRC="$APP_DIR/deploy/htaccess.example"

if [[ ! -f "$SRC" ]]; then
  echo "WARN: $SRC missing — skip public_html sync"
  exit 0
fi

if [[ ! -d "$PUBLIC_HTML" ]]; then
  echo "WARN: public_html not found: $PUBLIC_HTML (set CATALOGUS_PUBLIC_HTML in .env)"
  exit 0
fi

echo "==> Sync .htaccess → $PUBLIC_HTML/.htaccess"

copy_htaccess() {
  cp "$SRC" "$PUBLIC_HTML/.htaccess"
}

if [[ -w "$PUBLIC_HTML" ]]; then
  copy_htaccess
else
  sudo cp "$SRC" "$PUBLIC_HTML/.htaccess"
  if OWNER=$(stat -c '%U:%G' "$PUBLIC_HTML" 2>/dev/null); then
    sudo chown "$OWNER" "$PUBLIC_HTML/.htaccess"
  fi
fi

grep -E '3001|RewriteRule' "$PUBLIC_HTML/.htaccess" | head -3 || true
echo "OK: public_html .htaccess synced (proxy → port 3001)"
