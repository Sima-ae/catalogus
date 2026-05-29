#!/usr/bin/env bash
# Run on VPS as root: bash scripts/vps-db-diagnose.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/superclones.cloud}"
cd "$APP_DIR"

echo "=== Catalogus database diagnose ==="
echo ""

if [[ ! -f .env ]]; then
  echo "FAIL: missing $APP_DIR/.env"
  exit 1
fi

echo "==> MariaDB service"
systemctl is-active mariadb 2>/dev/null || systemctl is-active mysql 2>/dev/null || echo "WARN: mariadb/mysql service not active"

echo ""
echo "==> .env check (no passwords printed)"
node scripts/check-env.mjs || true

echo ""
echo "==> Connection test"
set -a
# shellcheck disable=SC1091
source .env
set +a
node scripts/check-db.mjs || true

echo ""
echo "==> App health"
HEALTH=$(curl -sS "http://127.0.0.1:3001/api/health/db" 2>/dev/null || true)
echo "$HEALTH"
if echo "$HEALTH" | grep -q '"ok":true'; then
  echo "OK: app can reach MariaDB"
elif echo "$HEALTH" | grep -qi 'site access'; then
  echo "NOTE: health/db was blocked by site-access middleware (update app from git)"
else
  echo "WARN: catalogus DB health check failed — see journalctl -u catalogus"
fi

echo ""
echo "==> Site access (shop may require password if enabled)"
curl -sS "http://127.0.0.1:3001/api/site-access/status" 2>/dev/null || true
echo ""

echo ""
echo "If check-db failed:"
echo "  1. CyberPanel → Databases → supe_r_clones_cloud → reset/copy password"
echo "  2. nano $APP_DIR/.env  → DATABASE_URL=mysql://supe_r_clones_cloud:PASSWORD@127.0.0.1:3306/supe_r_clones_cloud"
echo "  3. systemctl restart catalogus"
