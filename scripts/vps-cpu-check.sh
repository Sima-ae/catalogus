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

echo "=== Catalogus process model (should be ONE next start on :3001) ==="
APP_DIR="${APP_DIR:-/var/www/superclones.cloud}"
if systemctl is-active catalogus &>/dev/null; then
  echo "  systemd catalogus: active"
else
  echo "  WARN: systemd catalogus is INACTIVE — a PM2 leftover may be serving :3001 instead"
fi
if command -v pm2 >/dev/null 2>&1 && pm2 pid catalogus &>/dev/null; then
  echo "  WARN: PM2 process 'catalogus' is running — deploy/catalogus.service says do not use PM2"
fi
echo ""
echo "  next-server cwd + listen ports (orphans from old deploys keep MariaDB connections open):"
for pid in $(ps -eo pid=,args= | awk '/[n]ext-server/ { print $1 }'); do
  cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || echo '?')
  ports=$(ss -lptn 2>/dev/null | awk -v p="pid=$pid" '$0 ~ p { print $4 }' | tr '\n' ' ')
  printf "  PID %-8s cwd=%s  listen=%s\n" "$pid" "$cwd" "${ports:-?}"
done
echo ""

echo "=== MariaDB threads for supe_r_clones_cloud ==="
if [[ -f "$APP_DIR/scripts/show-db-processlist.mjs" && -f "$APP_DIR/.env" ]]; then
  (cd "$APP_DIR" && node scripts/show-db-processlist.mjs) || echo "  (processlist script failed — check .env credentials)"
elif [[ -f "$APP_DIR/scripts/show-db-processlist.ts" && -f "$APP_DIR/.env" ]] && command -v npx >/dev/null 2>&1; then
  (cd "$APP_DIR" && npx --yes tsx scripts/show-db-processlist.ts) || echo "  (processlist script failed — check .env credentials)"
else
  echo "  processlist script not on this deploy yet. Run: node scripts/show-db-processlist.mjs"
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
echo "  1) node scripts/show-db-processlist.mjs  → KILL long Copying/Sorting/Lock queries"
echo "  2) Extra next-server PIDs (cwd not /var/www/superclones.cloud) are other apps or orphans"
echo "  3) systemd catalogus should be the only catalogus; stop PM2 catalogus if systemd is used"
echo "  4) Stop leftover import workers: pkill -f 'tsx scripts/' or catalogus-import-worker@*"
echo "  5) inkoop-autos on :3000 and CyberCP scans also share this MariaDB"
