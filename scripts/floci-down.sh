#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FLOCI_DIR="${REPO_ROOT}/infrastructure/floci"

COMPOSE_FILE="${FLOCI_DIR}/docker-compose.yml"
if [ -f "${FLOCI_DIR}/.env" ]; then
  # shellcheck disable=SC1091
  source "${FLOCI_DIR}/.env"
  [ "${FLOCI_USE_IMAGE:-0}" = "1" ] && COMPOSE_FILE="${FLOCI_DIR}/docker-compose.image.yml"
fi

docker compose -f "${COMPOSE_FILE}" --env-file "${FLOCI_DIR}/.env" down 2>/dev/null \
  || docker stop scas-floci 2>/dev/null \
  || true

echo "✅ SCAS Floci stopped"
