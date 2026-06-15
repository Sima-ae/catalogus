#!/usr/bin/env bash
# Run on the VPS after code is updated (git pull or rsync). Intended to run as root.
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

# shellcheck source=lib/git-safe-directory.sh
source "$(dirname "$0")/lib/git-safe-directory.sh"
ensure_git_safe_directory "$APP_DIR"

if [[ "$(uname -s)" == "Darwin" && "$APP_DIR" == /Users/* && "${DEPLOY_ALLOW_LOCAL:-}" != "1" ]]; then
  echo "ERROR: scripts/deploy.sh is for the VPS only — not your Mac."
  echo ""
  echo "  Local development:"
  echo "    Terminal 1:  npm run db:tunnel"
  echo "    Terminal 2:  npm run dev"
  echo ""
  echo "  Deploy to production (pick one):"
  echo "    • Push to main → GitHub Actions deploys automatically"
  echo "    • SSH to the server:"
  echo "        ssh root@superclones.cloud 'cd /var/www/superclones.cloud && bash scripts/deploy.sh'"
  exit 1
fi

if [[ "$(id -un)" != "root" ]]; then
  echo "WARN: not running as root ($(id -un)) — prefer: sudo bash scripts/deploy.sh"
fi

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

echo "==> Install dependencies"
if [[ "${SKIP_BUILD:-}" == "1" ]]; then
  echo "    (production only — .next pre-built by CI)"
  npm ci --omit=dev
else
  echo "    (include devDependencies for build)"
  npm ci
fi

if [[ "${SKIP_BUILD:-}" == "1" ]]; then
  if [[ ! -f .next/BUILD_ID ]]; then
    echo "ERROR: SKIP_BUILD=1 but .next/BUILD_ID is missing."
    echo "Deploy workflow should upload a CI build artifact before running deploy.sh."
    exit 1
  fi
  echo "==> Skip Next.js build (using pre-built .next from CI)"
else
  echo "==> Build Next.js (production)"
  (
    while true; do
      sleep 45
      echo "==> build still running ($(date -u +%H:%M:%S) UTC)…"
    done
  ) &
  HEARTBEAT_PID=$!
  trap 'kill "$HEARTBEAT_PID" 2>/dev/null || true' EXIT
  set +e
  NODE_ENV=production npm run build
  BUILD_EXIT=$?
  set -e
  kill "$HEARTBEAT_PID" 2>/dev/null || true
  wait "$HEARTBEAT_PID" 2>/dev/null || true
  if [[ "$BUILD_EXIT" -ne 0 ]]; then
    echo "ERROR: next build failed (exit $BUILD_EXIT)"
    exit "$BUILD_EXIT"
  fi
fi

echo "==> Test MariaDB before restart"
if ! node scripts/check-db.mjs; then
  echo "ERROR: Cannot connect to MariaDB with .env on this server."
  echo "Fix DATABASE_URL in $APP_DIR/.env (CyberPanel → Databases → copy password)."
  echo "Example: DATABASE_URL=mysql://supe_r_clones_cloud:PASSWORD@127.0.0.1:3306/supe_r_clones_cloud"
  exit 1
fi

echo "==> Restart application"
if systemctl is-active --quiet catalogus 2>/dev/null; then
  systemctl restart catalogus
  echo "Restarted systemd unit: catalogus"
elif command -v pm2 >/dev/null 2>&1; then
  pm2 restart catalogus 2>/dev/null || pm2 start npm --name catalogus -- start -- -p 3001
  echo "Restarted PM2 process: catalogus"
else
  echo "WARN: No catalogus systemd unit or PM2 process. Start manually: npm run start -- -p 3001"
fi

sleep 2
echo "==> Health check (app + DB)"
if curl -sf http://127.0.0.1:3001/api/health/db | grep -q '"ok":true'; then
  echo "OK: /api/health/db"
else
  echo "WARN: /api/health/db failed (check catalogus logs: journalctl -u catalogus -n 50)"
fi

if [[ -f scripts/sync-public-html.sh ]]; then
  chmod +x scripts/sync-public-html.sh 2>/dev/null || true
  export APP_DIR
  bash scripts/sync-public-html.sh
fi

if [[ -f scripts/ensure-catalog-images-access.sh ]]; then
  chmod +x scripts/ensure-catalog-images-access.sh 2>/dev/null || true
  export APP_DIR
  bash scripts/ensure-catalog-images-access.sh
fi

if [[ -f scripts/link-public-images.sh ]]; then
  chmod +x scripts/link-public-images.sh 2>/dev/null || true
  export APP_DIR
  bash scripts/link-public-images.sh
fi

echo "==> Deploy finished OK"
echo "==> Path: $(pwd)"
echo "==> Commit: $(git log -1 --oneline)"
echo "NOTE: Catalogus runs on port 3001 (inkoop-autos uses 3000). LiteSpeed/nginx must proxy to 3001."
