#!/usr/bin/env bash
# Detect CodePipeline artifacts in scenario bucket (scenario 23).
set -euo pipefail

SCENARIO_ID="${1:-23}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=../../scripts/floci-bridge.sh
source "${ROOT}/scripts/floci-bridge.sh"

scas_floci_require
BUCKET="$(scas_floci_bucket_for_scenario "$SCENARIO_ID")"
PIPELINE="scas-sc${SCENARIO_ID}-pipeline"

echo "🔍 CodePipeline check — ${PIPELINE}"
if scas_floci_aws codepipeline get-pipeline --name "$PIPELINE" >/dev/null 2>&1; then
  echo "⚠️  Pipeline ${PIPELINE} exists — review artifact store s3://${BUCKET}"
  scas_floci_aws codepipeline get-pipeline --name "$PIPELINE" --query 'pipeline.stages[*].name' --output text 2>/dev/null || true
  exit 1
fi
echo "✅ Pipeline not registered (run seed.sh on Floci track)."
exit 0
