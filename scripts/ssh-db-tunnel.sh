#!/usr/bin/env bash
# Forwards local port 3306 → MariaDB on VPS (127.0.0.1:3306 on server).
#
# Usage (foreground — recommended, enter SSH password when prompted):
#   ./scripts/ssh-db-tunnel.sh
#
# Usage (background):
#   ./scripts/ssh-db-tunnel.sh --background
#
# Env overrides:
#   VPS_HOST=89.116.38.197  SSH_USER=root  LOCAL_PORT=3306

set -e

VPS_HOST="${VPS_HOST:-89.116.38.197}"
SSH_USER="${SSH_USER:-root}"
LOCAL_PORT="${LOCAL_PORT:-3306}"
REMOTE_PORT="${REMOTE_PORT:-3306}"
BACKGROUND=false

if [[ "${1:-}" == "--background" || "${1:-}" == "-f" ]]; then
  BACKGROUND=true
fi

if lsof -i ":${LOCAL_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port ${LOCAL_PORT} is already in use (tunnel may already be running)."
  echo "Test with: node scripts/check-db.mjs"
  exit 0
fi

echo "Tunnel: localhost:${LOCAL_PORT} → ${SSH_USER}@${VPS_HOST}:127.0.0.1:${REMOTE_PORT}"
echo ".env should have: DB_HOST=127.0.0.1  DB_PORT=${LOCAL_PORT}"
echo ""

if $BACKGROUND; then
  echo "Starting tunnel in background..."
  ssh -f -N -o ExitOnForwardFailure=yes \
    -L "${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" \
    "${SSH_USER}@${VPS_HOST}"
  sleep 1
  if lsof -i ":${LOCAL_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Tunnel running. Test: node scripts/check-db.mjs"
  else
    echo "Tunnel failed to start. Run without --background to see SSH errors."
    exit 1
  fi
else
  echo "You will be asked for your VPS SSH password (unless you use SSH keys)."
  echo "Keep this terminal open while developing. Press Ctrl+C to stop."
  echo ""
  exec ssh -N -o ExitOnForwardFailure=yes \
    -L "${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}" \
    "${SSH_USER}@${VPS_HOST}"
fi
