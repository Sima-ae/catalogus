#!/usr/bin/env bash
# Ensure CATALOGUS_PUBLIC_HTML in .env and images directory is readable.
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PUBLIC_HTML="${CATALOGUS_PUBLIC_HTML:-/home/superclones.cloud/public_html}"
IMAGES_SRC="${PUBLIC_HTML}/images"
ENV_FILE="${APP_DIR}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "WARN: no .env at $ENV_FILE"
  exit 0
fi

if ! grep -qE '^CATALOGUS_PUBLIC_HTML=' "$ENV_FILE" 2>/dev/null; then
  echo "CATALOGUS_PUBLIC_HTML=${PUBLIC_HTML}" >> "$ENV_FILE"
  echo "==> Added CATALOGUS_PUBLIC_HTML to .env"
else
  echo "OK: CATALOGUS_PUBLIC_HTML already in .env"
fi

if [[ ! -d "$IMAGES_SRC" ]]; then
  echo "WARN: images directory not found: $IMAGES_SRC"
  exit 0
fi

HOME_DIR="$(dirname "$PUBLIC_HTML")"
for d in "$HOME_DIR" "$PUBLIC_HTML"; do
  if [[ -d "$d" ]]; then
    chmod o+x "$d" 2>/dev/null || true
  fi
done
chmod -R a+rX "$IMAGES_SRC" 2>/dev/null || true

for sub in imports/facebook imports/woocommerce uploads; do
  if mkdir -p "${IMAGES_SRC}/${sub}" 2>/dev/null; then
    chmod a+rX "${IMAGES_SRC}/${sub}" 2>/dev/null || true
    echo "OK: ${IMAGES_SRC}/${sub}"
  fi
done

if test -r "${IMAGES_SRC}/HORLOGES" 2>/dev/null || find "$IMAGES_SRC" -type f 2>/dev/null | head -1 | grep -q .; then
  echo "OK: images readable under $IMAGES_SRC"
else
  echo "WARN: could not verify read access to $IMAGES_SRC"
fi
