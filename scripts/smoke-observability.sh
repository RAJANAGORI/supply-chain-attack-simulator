#!/usr/bin/env bash
# Smoke check for optional Elasticsearch + Kibana observability stack.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ES_URL="${SCAS_ES_URL:-http://localhost:9200}"

pass=0
fail=0
ok() { echo "PASS: $*"; pass=$((pass + 1)); }
bad() { echo "FAIL: $*"; fail=$((fail + 1)); }

if ! curl -fsS "${ES_URL}/_cluster/health" >/dev/null 2>&1; then
  echo "Elasticsearch is not reachable at ${ES_URL}"
  echo "Start it with: ./scripts/elasticsearch-up.sh"
  exit 1
fi

RULE_COUNT="$(curl -fsS "${ES_URL}/scas-rules/_count" | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).count')"
if [[ "${RULE_COUNT}" -ge 22 ]]; then
  ok "scas-rules has ${RULE_COUNT} documents (expected >= 22)"
else
  bad "scas-rules has ${RULE_COUNT} documents (expected >= 22)"
fi

export SCAS_ES_URL="${ES_URL}"
SHIP_OUT="$(node "${ROOT}/detection-tools/es/ship-findings.js" "${ROOT}/scenarios/01-typosquatting/victim-app" --scenario=01)"
echo "${SHIP_OUT}"

CAPTURE_OUT="$(node "${ROOT}/detection-tools/es/ship-captures.js")"
echo "${CAPTURE_OUT}"

DET_COUNT="$(curl -fsS "${ES_URL}/scas-detections/_count?ignore_unavailable=true" | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).count')"
if [[ "${DET_COUNT}" -gt 0 ]]; then
  ok "scas-detections has ${DET_COUNT} documents after ship-findings + ship-captures"
else
  bad "scas-detections is empty (run scenario 01 once to generate captured-data.json, or check shippers)"
fi

echo ""
echo "Smoke summary: ${pass} passed, ${fail} failed"
if [[ "${fail}" -gt 0 ]]; then
  exit 1
fi
