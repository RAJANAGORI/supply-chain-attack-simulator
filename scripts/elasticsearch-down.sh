#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/observability/docker-compose.yml"
ENV_FILE="${ROOT_DIR}/observability/.env"

REMOVE_VOLUMES=false
for arg in "$@"; do
  if [[ "${arg}" == "--volumes" ]]; then
    REMOVE_VOLUMES=true
  fi
done

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Missing ${COMPOSE_FILE}"
  exit 1
fi

if [[ -f "${ENV_FILE}" ]]; then
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" down
else
  docker compose -f "${COMPOSE_FILE}" down
fi

if [[ "${REMOVE_VOLUMES}" == "true" ]]; then
  docker volume rm scas-es-data 2>/dev/null || true
  echo "Removed scas-es-data volume."
fi

echo "Elasticsearch + Kibana stack stopped."
