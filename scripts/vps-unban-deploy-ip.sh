#!/usr/bin/env bash
# Unblock one GitHub Actions runner IP after a failed deploy (run on VPS as root).
#
#   bash /var/www/superclones.cloud/scripts/vps-unban-deploy-ip.sh 20.171.55.50
#
# Copy the IP from the failed GitHub log line: "This job egress IP: …"
set -euo pipefail

if [[ "$(id -un)" != "root" ]]; then
  echo "ERROR: run as root"
  exit 1
fi

IP="${1:-}"
if [[ ! "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Usage: $0 <github-runner-ipv4>"
  echo "Example: $0 20.171.55.50"
  exit 1
fi

echo "==> Unban / allow ${IP} for SSH deploy"
if command -v csf >/dev/null 2>&1; then
  csf -dr "$IP" 2>/dev/null || true
  csf -tr "$IP" 2>/dev/null || true
  csf -a "$IP" "GitHub Actions deploy (single run)" 2>/dev/null || true
  csf -r 2>/dev/null || true
  echo "CSF: removed deny, added allow for ${IP}"
else
  echo "WARN: CSF not found"
fi

if command -v fail2ban-client >/dev/null 2>&1; then
  fail2ban-client set sshd unbanip "$IP" 2>/dev/null || true
  echo "fail2ban: unbanip ${IP}"
fi

echo ""
echo "For all future GitHub runs, also run:"
echo "  bash /var/www/superclones.cloud/scripts/vps-allow-github-actions-ssh.sh"
echo ""
echo "Then re-run the deploy workflow on GitHub."
