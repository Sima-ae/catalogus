#!/usr/bin/env bash
# Run on the VPS as root when GitHub Actions cannot reach SSH (CSF / fail2ban).
#
#   bash /var/www/superclones.cloud/scripts/vps-allow-github-actions-ssh.sh
#
# Allows inbound SSH from current GitHub Actions IP ranges (see api.github.com/meta).
# Safe with key-only root login; does not open passwords.
set -euo pipefail

if [[ "$(id -un)" != "root" ]]; then
  echo "ERROR: run as root"
  exit 1
fi

PORT="${1:-22}"
META_URL="${GITHUB_META_URL:-https://api.github.com/meta}"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

echo "==> Fetching GitHub Actions IP ranges"
if ! curl -fsSL "$META_URL" -o "$TMP"; then
  echo "ERROR: could not download $META_URL"
  exit 1
fi

# actions = hosted runners; optional: include hooks for webhook runners
RANGES="$(node -e "
const j = require('fs').readFileSync(process.argv[1], 'utf8');
const m = JSON.parse(j);
const a = new Set([...(m.actions || []), ...(m.hooks || [])]);
for (const c of a) console.log(c);
" "$TMP" 2>/dev/null || python3 -c "
import json, sys
m = json.load(open(sys.argv[1]))
for c in sorted(set(m.get('actions', []) + m.get('hooks', []))):
    print(c)
" "$TMP")"

if [[ -z "$RANGES" ]]; then
  echo "ERROR: no actions ranges in meta JSON"
  exit 1
fi

COUNT=0
if command -v csf >/dev/null 2>&1; then
  echo "==> CSF: allow GitHub Actions → TCP ${PORT}"
  while IFS= read -r cidr; do
    [[ -z "$cidr" ]] && continue
    if csf -a "$cidr" "GitHub Actions deploy" 2>/dev/null; then
      COUNT=$((COUNT + 1))
    fi
  done <<< "$RANGES"
  echo "CSF: added/updated $COUNT allow entries (csf -a)"
  csf -r 2>/dev/null || true
else
  echo "WARN: CSF not installed — skip csf -a"
fi

if command -v fail2ban-client >/dev/null 2>&1; then
  echo ""
  echo "==> fail2ban sshd (unban if many bans)"
  fail2ban-client status sshd 2>/dev/null || true
  echo "To unban one IP: fail2ban-client set sshd unbanip <IP>"
fi

echo ""
echo "==> Ensure TCP ${PORT} is open (not only GitHub IPs)"
if command -v csf >/dev/null 2>&1; then
  grep -E '^TCP_IN' /etc/csf/csf.conf 2>/dev/null | head -3 || true
fi
if command -v ufw >/dev/null 2>&1; then
  ufw status | head -15 || true
fi

echo ""
echo "Done. Re-run deploy on GitHub. GitHub secret VPS_HOST should be:"
echo "  superclones.cloud   (not only do-it.vip unless that is your public A record)"
