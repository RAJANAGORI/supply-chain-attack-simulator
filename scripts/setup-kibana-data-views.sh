#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"

if ! curl -fsS "${KIBANA_URL}/api/status" >/dev/null 2>&1; then
  echo "Kibana is not reachable at ${KIBANA_URL}"
  echo "Start the stack with: ./scripts/elasticsearch-up.sh"
  exit 1
fi

if [[ ! -d "${ROOT_DIR}/detection-tools/node_modules" ]]; then
  npm install --prefix "${ROOT_DIR}/detection-tools" --no-fund --no-audit
fi

export KIBANA_URL
node "${ROOT_DIR}/detection-tools/es/setup-kibana-data-views.js"
