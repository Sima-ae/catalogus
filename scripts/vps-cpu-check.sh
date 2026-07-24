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

echo "=== Stuck DB / import / backfill scripts? (KILL THESE if idle shop is pegged) ==="
ps aux | grep -E '[t]sx|[n]ode.*(backfill|import|rebuild|shuffle|mirror|translate)' || echo "  (none obvious)"
echo ""
echo "=== Import worker template units ==="
systemctl list-units 'catalogus-import-worker@*' --all --no-pager 2>/dev/null || echo "  (none)"
echo ""

echo "=== MariaDB threads (if mysql client available) ==="
if command -v mysql >/dev/null 2>&1; then
  mysql -e "SHOW FULL PROCESSLIST;" 2>/dev/null | head -40 || echo "  (mysql client failed — check .env credentials)"
else
  echo "  mysql client not in PATH"
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
echo "  1) Top process mysqld → SHOW FULL PROCESSLIST; KILL long queries; check scrapers in access log"
echo "  2) Top process node + import/backfill → pkill -f 'tsx scripts/' or stop catalogus-import-worker@*"
echo "  3) Top process inkoop / PM2 on :3000 → that app shares this VPS; stop or move it"
echo "  4) catalogus restart loop → journalctl -u catalogus -n 100"
echo "  5) After deploy of idle-CPU fixes: middleware no longer self-fetches /api/site-access/check"
