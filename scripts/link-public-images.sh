#!/usr/bin/env bash
# Link Next.js public/images → CyberPanel public_html/images (optional fast path).
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"

if [[ -z "${CATALOGUS_PUBLIC_HTML:-}" && -f "$APP_DIR/.env" ]]; then
  line=$(grep -E '^CATALOGUS_PUBLIC_HTML=' "$APP_DIR/.env" | tail -1 || true)
  if [[ -n "$line" ]]; then
    CATALOGUS_PUBLIC_HTML="${line#*=}"
    CATALOGUS_PUBLIC_HTML="${CATALOGUS_PUBLIC_HTML%\"}"
    CATALOGUS_PUBLIC_HTML="${CATALOGUS_PUBLIC_HTML#\"}"
  fi
fi

PUBLIC_HTML="${CATALOGUS_PUBLIC_HTML:-/home/superclones.cloud/public_html}"
IMAGES_SRC="${PUBLIC_HTML}/images"
LINK="${APP_DIR}/public/images"

if [[ ! -d "$IMAGES_SRC" ]]; then
  if [[ "$(uname -s)" == "Darwin" ]] || [[ ! -d "$PUBLIC_HTML" ]]; then
    echo "WARN: $IMAGES_SRC not found."
    echo "      This script is for the VPS. On your Mac, leave CATALOGUS_PUBLIC_HTML unset in .env"
    echo "      and use public/images/imports/ locally (or run this script over SSH on the server)."
  else
    echo "WARN: $IMAGES_SRC not found — app will serve /images via API route if CATALOGUS_PUBLIC_HTML is set"
  fi
  exit 0
fi

mkdir -p "${APP_DIR}/public"

if [[ -L "$LINK" ]]; then
  rm -f "$LINK"
elif [[ -e "$LINK" ]]; then
  echo "WARN: $LINK exists and is not a symlink — leaving in place"
  exit 0
fi

ln -sfn "$IMAGES_SRC" "$LINK"
echo "OK: $LINK -> $(readlink -f "$LINK")"
