#!/usr/bin/env bash
# Run on the VPS after code is updated (git pull or rsync).
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

# shellcheck source=lib/git-safe-directory.sh
source "$(dirname "$0")/lib/git-safe-directory.sh"
ensure_git_safe_directory "$APP_DIR"

echo "==> Deploy catalogus in $APP_DIR"

echo "==> Verify repository checkout"
if [[ ! -d .git ]]; then
  echo "ERROR: $APP_DIR is not a git repository. Re-clone from GitHub (see README.md)."
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

# Old VPS layouts cloned into APP_DIR/catalogus — Next still type-checks it and breaks the build.
NESTED="${APP_DIR}/catalogus"
if [[ -d "$NESTED" ]] && [[ -f "$APP_DIR/package.json" ]] && [[ -d "$APP_DIR/src" ]]; then
  echo "==> Remove stale nested app directory: $NESTED"
  rm -rf "$NESTED"
fi

if [[ ! -f .env ]]; then
  echo "ERROR: Missing .env — copy .env.vps.example to .env and configure secrets."
  exit 1
fi

if grep -qE '^NEXT_PUBLIC_BASE_PATH=/catalogus' .env 2>/dev/null; then
  echo "ERROR: .env has NEXT_PUBLIC_BASE_PATH=/catalogus — app must be at / (site root)."
  echo "Set: NEXT_PUBLIC_BASE_PATH="
  echo "     NEXT_PUBLIC_APP_URL=https://superclones.cloud"
  exit 1
fi
if grep -qE '^NEXT_PUBLIC_APP_URL=.*superclones\.cloud/catalogus' .env 2>/dev/null; then
  echo "ERROR: .env has NEXT_PUBLIC_APP_URL with /catalogus — use https://superclones.cloud"
  exit 1
fi

echo "==> Check required environment variables"
if ! node scripts/check-env.mjs; then
  echo "ERROR: Fix .env (see messages above). SITE_ACCESS_COOKIE_SECRET must be 16+ random characters."
  exit 1
fi

echo "==> Install dependencies (include devDependencies for build)"
npm ci

echo "==> Build Next.js (production)"
NODE_ENV=production npm run build

echo "==> Restart application"
if systemctl is-active --quiet catalogus 2>/dev/null; then
  sudo systemctl restart catalogus
  echo "Restarted systemd unit: catalogus"
elif command -v pm2 >/dev/null 2>&1; then
  pm2 restart catalogus 2>/dev/null || pm2 start npm --name catalogus -- start -- -p 3001
  echo "Restarted PM2 process: catalogus"
else
  echo "WARN: No catalogus systemd unit or PM2 process. Start manually: npm run start -- -p 3001"
fi

if [[ -f scripts/sync-public-html.sh ]]; then
  chmod +x scripts/sync-public-html.sh 2>/dev/null || true
  export APP_DIR
  bash scripts/sync-public-html.sh || sudo -E bash scripts/sync-public-html.sh || \
    echo "WARN: public_html .htaccess sync failed — copy deploy/htaccess.example manually"
fi

if [[ -f scripts/link-public-images.sh ]]; then
  chmod +x scripts/link-public-images.sh 2>/dev/null || true
  export APP_DIR
  bash scripts/link-public-images.sh || sudo -E bash scripts/link-public-images.sh || \
    echo "WARN: public/images symlink skipped — /images still works via Next.js route if CATALOGUS_PUBLIC_HTML is set"
fi

echo "==> Deploy finished OK"
echo "==> Path: $(pwd)"
echo "==> Commit: $(git log -1 --oneline)"
echo "NOTE: Catalogus runs on port 3001 (inkoop-autos uses 3000). LiteSpeed/nginx must proxy to 3001."
echo "      public_html is NOT updated unless VPS_APP_PATH is set to that directory."
