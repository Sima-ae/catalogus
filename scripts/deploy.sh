#!/usr/bin/env bash
# Run on the VPS after code is updated (git pull or rsync).
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

echo "==> Deploy catalogus in $APP_DIR"

if [[ ! -f .env ]]; then
  echo "ERROR: Missing .env — copy .env.vps.example to .env and configure secrets."
  exit 1
fi

export NODE_ENV=production

echo "==> Install dependencies"
npm ci

echo "==> Build Next.js (basePath /catalogus)"
npm run build

echo "==> Restart application"
if systemctl is-active --quiet catalogus 2>/dev/null; then
  sudo systemctl restart catalogus
  echo "Restarted systemd unit: catalogus"
elif command -v pm2 >/dev/null 2>&1; then
  pm2 restart catalogus 2>/dev/null || pm2 start npm --name catalogus -- start
  echo "Restarted PM2 process: catalogus"
else
  echo "WARN: No catalogus systemd unit or PM2 process. Start manually: npm run start"
fi

echo "==> Deploy finished OK"
