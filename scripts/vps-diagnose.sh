#!/usr/bin/env bash
# Run on the VPS to see where the app lives vs public_html.
# Usage: bash scripts/vps-diagnose.sh
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"

echo "=== Catalogus VPS diagnose ==="
echo ""
echo "Current directory: $APP_DIR"
echo ""

if [[ -d "$APP_DIR/.git" ]]; then
  echo "Git repo: yes"
  echo "  Branch: $(git -C "$APP_DIR" branch --show-current 2>/dev/null || echo '?')"
  echo "  Commit: $(git -C "$APP_DIR" log -1 --oneline)"
  echo "  Remote: $(git -C "$APP_DIR" remote get-url origin 2>/dev/null || echo '?')"
else
  echo "Git repo: NO — GitHub deploy cannot update this folder"
fi

echo ""
echo "Common paths (check which exists on your server):"
for p in \
  "/var/www/superclones.cloud" \
  "/home/*/domains/superclones.cloud/public_html" \
  "/home/*/superclones.cloud/public_html" \
  "/var/www/superclones.cloud/public_html"; do
  # shellcheck disable=SC2086
  for expanded in $p; do
    if [[ -d "$expanded" ]]; then
      marker=""
      [[ "$expanded" == "$APP_DIR" ]] && marker="  <-- you are here"
      if [[ -d "$expanded/.git" ]]; then
        echo "  [git] $expanded$marker"
      else
        echo "  [dir] $expanded$marker"
      fi
    fi
  done
done

echo ""
if [[ -f "$APP_DIR/.env" ]]; then
  echo ".env: present"
  grep -E '^NEXT_PUBLIC_' "$APP_DIR/.env" 2>/dev/null || true
else
  echo ".env: MISSING"
fi

echo ""
if systemctl is-active --quiet catalogus 2>/dev/null; then
  echo "catalogus service: running"
  systemctl status catalogus --no-pager -l 2>/dev/null | head -5 || true
else
  echo "catalogus service: not running (or not installed)"
fi

echo ""
if command -v curl >/dev/null 2>&1; then
  echo "Local Next.js (port 3000):"
  curl -s -o /dev/null -w "  HTTP %{http_code}\n" http://127.0.0.1:3000/ 2>/dev/null || echo "  not reachable"
fi

echo ""
echo "GitHub Actions updates ONLY the directory in secret VPS_APP_PATH."
echo "If you browse public_html in FTP, set VPS_APP_PATH to that path and clone the repo there,"
