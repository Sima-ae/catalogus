#!/usr/bin/env bash
# One-time fix when VPS_APP_PATH exists but is not a git clone.
# Usage on VPS: export APP_DIR=/var/www/superclones.cloud && bash scripts/vps-fix-git.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/superclones.cloud}"
REPO_URL="${REPO_URL:-https://github.com/Sima-ae/catalogus.git}"

# shellcheck source=lib/git-safe-directory.sh
source "$(dirname "$0")/lib/git-safe-directory.sh"
ensure_git_safe_directory "$APP_DIR"

echo "==> Fix git deploy at: $APP_DIR"
echo "==> Repository: $REPO_URL"

if [[ -d "$APP_DIR/.git" ]]; then
  echo "Already a git repo. Updating..."
  cd "$APP_DIR"
  git fetch origin main
  git reset --hard origin/main
  git clean -fd
  echo "OK: $(git log -1 --oneline)"
  exit 0
fi

if [[ ! -d "$APP_DIR" ]]; then
  echo "==> Cloning into new directory"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO_URL" "$APP_DIR"
  echo "OK: cloned"
  exit 0
fi

ENV_BACKUP=""
if [[ -f "$APP_DIR/.env" ]]; then
  ENV_BACKUP="$(mktemp)"
  cp "$APP_DIR/.env" "$ENV_BACKUP"
  echo "==> Backed up .env"
fi

if [[ -z "$(ls -A "$APP_DIR" 2>/dev/null)" ]]; then
  rmdir "$APP_DIR" 2>/dev/null || true
  git clone "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR"
  git init -b main
  git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
  git fetch origin main
  git reset --hard origin/main
  git clean -fd
fi

cd "$APP_DIR"
if [[ -n "$ENV_BACKUP" ]]; then
  cp "$ENV_BACKUP" .env
  rm -f "$ENV_BACKUP"
fi

echo "OK: $(git log -1 --oneline)"
echo "Next: edit .env if needed, then bash scripts/deploy.sh"
