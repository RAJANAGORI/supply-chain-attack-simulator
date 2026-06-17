#!/usr/bin/env bash
# Alert if Floci ECR has images for a scenario repo (scenario 14).
set -euo pipefail
SCENARIO_ID="${1:-14}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=../../scripts/floci-bridge.sh
source "${ROOT}/scripts/floci-bridge.sh"

scas_floci_require
REPO="$(scas_floci_ecr_repo_for_scenario "$SCENARIO_ID")"
COUNT="$(scas_floci_aws ecr describe-images --repository-name "$REPO" --query 'length(imageDetails)' --output text 2>/dev/null || echo 0)"

echo "🔍 ECR check — scenario ${SCENARIO_ID}, repo ${REPO}: ${COUNT} image(s)"
if [ "${COUNT}" != "0" ] && [ "${COUNT}" != "None" ]; then
  echo "⚠️  Compromised or unexpected images present in emulated ECR."
  scas_floci_aws ecr describe-images --repository-name "$REPO" --output table 2>/dev/null || true
  exit 1
fi
echo "✅ No images in ECR (push not performed yet)."
exit 0
