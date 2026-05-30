#!/usr/bin/env bash
# Run on the VPS as root: verify SSH is reachable for GitHub Actions deploy.
#   bash scripts/vps-check-github-ssh.sh
set -euo pipefail

PORT="${1:-22}"

echo "==> Hostname / public IP"
hostname -f 2>/dev/null || hostname
echo "Use this in GitHub secret VPS_HOST only if it resolves publicly:"
getent hosts "$(hostname -f 2>/dev/null || hostname)" || true
echo ""
echo "Recommended VPS_HOST: superclones.cloud (or your VPS public IP)"

echo ""
echo "==> sshd listening on port ${PORT}"
ss -tlnp | grep -E ":${PORT}\\b" || { echo "WARN: nothing listening on ${PORT}"; }

echo ""
echo "==> Deploy key in root authorized_keys"
AUTH=/root/.ssh/authorized_keys
if [[ -f "$AUTH" ]] && grep -q 'catalogus-github-actions' "$AUTH" 2>/dev/null; then
  echo "OK: catalogus-github-actions key present"
else
  echo "MISSING: run scripts/setup-github-deploy-ssh.sh and update GitHub VPS_SSH_KEY"
fi

echo ""
echo "==> Firewall (allow inbound TCP ${PORT} from anywhere for CI deploy)"
if command -v csf >/dev/null 2>&1; then
  csf -g 2>/dev/null | head -8 || true
  echo "If SSH works from your Mac but not GitHub: check CSF deny list / LFD"
fi
if command -v ufw >/dev/null 2>&1; then
  ufw status | head -20 || true
fi
if command -v fail2ban-client >/dev/null 2>&1; then
  fail2ban-client status sshd 2>/dev/null || true
fi

echo ""
echo "==> GitHub Actions IP ranges (ssh must not block these indefinitely)"
echo "See: https://api.github.com/meta (actions key)"
curl -fsSL https://api.github.com/meta 2>/dev/null | head -c 200 || echo "(curl failed — check outbound HTTPS)"

echo ""
echo "Done. Secrets in GitHub → catalogus → Settings → Secrets:"
echo "  VPS_HOST=superclones.cloud   VPS_USER=root   VPS_SSH_KEY=<deploy private key, no passphrase>"
