#!/usr/bin/env bash
# Find what is using CPU on the VPS (run as root via SSH or CyberPanel terminal).
# Usage: bash scripts/vps-cpu-check.sh
set -euo pipefail

echo "=== CPU / memory snapshot ==="
date -u
echo ""
uptime
echo ""

echo "=== Top CPU processes ==="
ps aux --sort=-%cpu | head -20
echo ""

echo "=== Top memory processes ==="
ps aux --sort=-%mem | head -10
echo ""

echo "=== Catalogus / Node / MySQL services ==="
for svc in catalogus mariadb mysql; do
  if systemctl list-unit-files "$svc.service" &>/dev/null; then
    printf "  %-12s %s\n" "$svc:" "$(systemctl is-active "$svc" 2>/dev/null || echo inactive)"
  fi
done
if command -v pm2 >/dev/null 2>&1; then
  echo ""
  echo "PM2 processes:"
  pm2 list 2>/dev/null || true
fi
echo ""

echo "=== Redis (shared TTL cache) ==="
if command -v redis-cli >/dev/null 2>&1; then
  redis-cli ping 2>/dev/null || echo "  redis-cli present but ping failed"
else
  echo "  redis-cli not installed — set REDIS_URL after installing Redis"
  echo "    Alma/RHEL: dnf install -y redis && systemctl enable --now redis"
  echo "    Debian/Ubuntu: apt install redis-server && systemctl enable --now redis-server"
fi
if [[ -f /var/www/superclones.cloud/.env ]] && grep -q '^REDIS_URL=' /var/www/superclones.cloud/.env 2>/dev/null; then
  echo "  REDIS_URL is set in catalogus .env"
else
  echo "  WARN: REDIS_URL missing — catalog TTL cache is in-process only"
fi
echo ""

echo "=== Catalogus process model (should be ONE next start, not PM2 cluster) ==="
ps aux | grep -E '[n]ext-server|[n]ode.*next' | head -10 || true
echo ""

echo "=== MariaDB threads for supe_r_clones_cloud ==="
APP_DIR="${APP_DIR:-/var/www/superclones.cloud}"
if [[ -f "$APP_DIR/.env" ]] && command -v npx >/dev/null 2>&1; then
  (cd "$APP_DIR" && npx --yes tsx scripts/show-db-processlist.ts) || echo "  (processlist script failed — check .env credentials)"
elif command -v mysql >/dev/null 2>&1; then
  mysql -e "SHOW FULL PROCESSLIST;" 2>/dev/null | awk '
    NR==1 { print; next }
    BEGIN { IGNORECASE=1 }
    $0 ~ /Copying to tmp table|Sorting result|Waiting for table lock|supe_r_clones_cloud/ { print }
  ' | head -50 || echo "  (mysql client failed — check credentials)"
else
  echo "  mysql client / tsx not available"
fi
echo ""

echo "=== Recent catalogus logs ==="
journalctl -u catalogus -n 30 --no-pager 2>/dev/null || echo "  (no journalctl for catalogus)"
echo ""

echo "=== Quick health ==="
curl -sS -o /dev/null -w "catalogus :3001 health → HTTP %{http_code}\n" http://127.0.0.1:3001/api/health/db 2>/dev/null || echo "catalogus not reachable on :3001"
curl -sS -o /dev/null -w "inkoop     :3000 → HTTP %{http_code}\n" http://127.0.0.1:3000/ 2>/dev/null || echo "nothing on :3000"
echo ""
echo "If CPU is 100% with no shop visitors:"
echo "  1) Top process mysqld → npm run db:show-processlist ; KILL long Copying/Sorting/Lock queries"
echo "  2) Top process node + import/backfill → pkill -f 'tsx scripts/' or stop catalogus-import-worker@*"
echo "  3) Top process inkoop / PM2 on :3000 → that app shares this VPS; stop or move it"
echo "  4) catalogus restart loop → journalctl -u catalogus -n 100"
echo "  5) After deploy: pricelist no longer runs 6 parallel ROW_NUMBER counts; pool no longer resets on timeouts"
