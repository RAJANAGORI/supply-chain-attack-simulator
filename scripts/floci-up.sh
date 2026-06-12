#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FLOCI_DIR="${REPO_ROOT}/infrastructure/floci"
# shellcheck source=floci-bridge.sh
source "${SCRIPT_DIR}/floci-bridge.sh"

[ -f "${FLOCI_DIR}/.env" ] || { echo "Run ./scripts/floci-setup.sh first"; exit 1; }

# shellcheck disable=SC1091
source "${FLOCI_DIR}/.env" 2>/dev/null || true

COMPOSE_FILE="${FLOCI_DIR}/docker-compose.yml"
if [ "${FLOCI_USE_IMAGE:-0}" = "1" ]; then
  COMPOSE_FILE="${FLOCI_DIR}/docker-compose.image.yml"
fi

if [ "${FLOCI_USE_IMAGE:-0}" != "1" ] && [ ! -d "${REPO_ROOT}/vendor/floci-aws/docker" ]; then
  echo "❌ vendor/floci-aws missing. Run: ./scripts/floci-setup.sh"
  exit 1
fi

echo "🚀 Starting SCAS Floci emulator..."
docker compose -f "${COMPOSE_FILE}" --env-file "${FLOCI_DIR}/.env" up -d

echo "⏳ Waiting for health (${SCAS_FLOCI_ENDPOINT}/_floci/health)..."
TRIES=60
while [ "$TRIES" -gt 0 ]; do
  if scas_floci_health; then
    echo "✅ Floci is ready on port ${FLOCI_PORT:-4566}"
    echo "   Container: scas-floci"
    echo "   Enable labs: source ${REPO_ROOT}/.floci.env"
    exit 0
  fi
  TRIES=$((TRIES - 1))
  sleep 2
done

echo "❌ Floci did not become healthy in time."
echo "   Logs: docker logs scas-floci"
exit 1
