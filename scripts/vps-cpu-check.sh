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
ps aux --sort=-%cpu | head -15
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

echo "=== Stuck DB / import / backfill scripts? ==="
ps aux | grep -E '[t]sx|[n]ode.*(backfill|import|rebuild|shuffle)' || echo "  (none obvious)"
echo ""

echo "=== MariaDB threads (if mysql client available) ==="
if command -v mysql >/dev/null 2>&1; then
  mysql -e "SHOW FULL PROCESSLIST;" 2>/dev/null | head -20 || echo "  (mysql client failed — check .env credentials)"
else
  echo "  mysql client not in PATH"
fi
echo ""

echo "=== Recent catalogus logs ==="
journalctl -u catalogus -n 20 --no-pager 2>/dev/null || echo "  (no journalctl for catalogus)"
echo ""

echo "=== Quick health ==="
curl -sS -o /dev/null -w "catalogus :3001 → HTTP %{http_code}\n" http://127.0.0.1:3001/api/health/db 2>/dev/null || echo "catalogus not reachable on :3001"
curl -sS -o /dev/null -w "inkoop     :3000 → HTTP %{http_code}\n" http://127.0.0.1:3000/ 2>/dev/null || echo "nothing on :3000"
echo ""
echo "If CPU is 100%: note the top process name above (mysqld, node, npm, lsphp, etc.)."
echo "Common fixes:"
echo "  • mysqld high → kill long queries: SHOW FULL PROCESSLIST; then KILL <id>;"
echo "  • node/npm build → wait or kill stuck build; redeploy via GitHub Actions instead"
echo "  • backfill script → stop with: pkill -f backfill-product-taxonomy"
echo "  • catalogus loop → sudo systemctl restart catalogus"
