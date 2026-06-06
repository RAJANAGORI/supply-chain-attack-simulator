#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/observability/docker-compose.yml"
ENV_FILE="${ROOT_DIR}/observability/.env"
ENV_EXAMPLE="${ROOT_DIR}/observability/.env.example"
DETECTION_TOOLS_DIR="${ROOT_DIR}/detection-tools"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Desktop or the Docker Engine CLI."
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${ENV_EXAMPLE}" "${ENV_FILE}"
  echo "Created ${ENV_FILE} from .env.example"
fi

# shellcheck source=/dev/null
source "${ENV_FILE}"

echo "Starting Elasticsearch + Kibana..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d

echo "Waiting for Elasticsearch at http://localhost:${ES_PORT:-9200} ..."
for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:${ES_PORT:-9200}/_cluster/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! curl -fsS "http://localhost:${ES_PORT:-9200}/_cluster/health" >/dev/null 2>&1; then
  echo "Elasticsearch did not become healthy in time."
  exit 1
fi

echo "Installing detection-tools dependencies (if needed)..."
if [[ ! -d "${DETECTION_TOOLS_DIR}/node_modules" ]]; then
  npm install --prefix "${DETECTION_TOOLS_DIR}" --no-fund --no-audit
fi

export SCAS_ES_URL="${SCAS_ES_URL:-http://localhost:${ES_PORT:-9200}}"

echo "Applying index templates..."
node "${DETECTION_TOOLS_DIR}/es/apply-templates.js"

echo "Loading detection runbooks from scenarios/*/DETECT.md ..."
node "${DETECTION_TOOLS_DIR}/es/load-runbooks.js"

echo "Setting up Kibana data views and per-scenario saved searches..."
if curl -fsS "http://localhost:${KIBANA_PORT:-5601}/api/status" >/dev/null 2>&1; then
  KIBANA_URL="http://localhost:${KIBANA_PORT:-5601}" node "${DETECTION_TOOLS_DIR}/es/setup-kibana-data-views.js"
else
  echo "Kibana not ready yet; run ./scripts/setup-kibana-data-views.sh after it finishes starting."
fi

echo ""
echo "Observability stack is ready."
echo "  Elasticsearch: http://localhost:${ES_PORT:-9200}"
echo "  Kibana:        http://localhost:${KIBANA_PORT:-5601}"
echo ""
echo "Optional: export SCAS_ES_URL=${SCAS_ES_URL} before running scenarios"
echo "          so mock-server captures are forwarded live."
echo ""
echo "Ship scanner findings:"
echo "  node detection-tools/es/ship-findings.js scenarios/01-typosquatting/victim-app --scenario=01"
echo ""
echo "Backfill captured-data.json files:"
echo "  node detection-tools/es/ship-captures.js"
