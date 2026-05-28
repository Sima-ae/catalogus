#!/usr/bin/env bash
# Run on the VPS after code is updated (git pull or rsync).
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

echo "==> Deploy catalogus in $APP_DIR"

echo "==> Verify repository checkout"
if [[ ! -d .git ]]; then
  echo "ERROR: $APP_DIR is not a git repository. Re-clone from GitHub (see deploy/GITHUB_DEPLOY.md)."
  exit 1
fi
REQUIRED=(
  tsconfig.json
  jsconfig.json
  src/lib/paths.ts
  src/components/admin/AdminPageShell.tsx
)
for f in "${REQUIRED[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: Missing $f after git pull."
    echo "On the VPS run: git fetch origin main && git reset --hard origin/main && git clean -fd"
    echo "If still missing, re-clone: sudo -u deploy git clone https://github.com/Sima-ae/catalogus.git $APP_DIR"
    exit 1
  fi
done
echo "Git: $(git rev-parse --short HEAD) on $(git branch --show-current 2>/dev/null || echo detached)"

if [[ ! -f .env ]]; then
  echo "ERROR: Missing .env — copy .env.vps.example to .env and configure secrets."
  exit 1
fi

export NODE_ENV=production

echo "==> Install dependencies"
npm ci

echo "==> Build Next.js (production)"
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
