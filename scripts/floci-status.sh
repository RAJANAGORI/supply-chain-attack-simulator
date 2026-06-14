#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=floci-bridge.sh
source "${SCRIPT_DIR}/floci-bridge.sh"

echo "SCAS Floci status"
echo "  Endpoint: ${SCAS_FLOCI_ENDPOINT}"

if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'scas-floci'; then
  echo "  Container: scas-floci (running)"
elif docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'floci'; then
  echo "  Container: floci (running — external stack)"
else
  echo "  Container: not running"
fi

if scas_floci_health; then
  echo "  Health: ✅ reachable"
  curl -fsS "${SCAS_FLOCI_ENDPOINT}/_floci/health" | head -c 200
  echo ""
  if scas_floci_init_ready; then
    echo "  Init:   ✅ ready (S3/services)"
  else
    echo "  Init:   ⏳ not ready yet — wait or check: docker logs scas-floci --tail 50"
  fi
else
  echo "  Health: ❌ unreachable"
  echo "  Start: ./scripts/floci-up.sh"
  exit 1
fi
