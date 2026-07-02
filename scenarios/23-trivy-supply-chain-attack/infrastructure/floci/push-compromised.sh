#!/usr/bin/env bash
# Push compromised Trivy image marker to Floci ECR (scenario 23 capstone).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

[ "${TESTBENCH_MODE:-}" = "enabled" ] || exit 0
[ "${SCAS_FLOCI_ENABLED:-}" = "1" ] || exit 0

scas_floci_require || exit 0
REPO="$(scas_floci_ecr_repo_for_scenario 23)"
scas_floci_ecr_create "$REPO"

# Tag metadata only — full docker push optional in lab
BUCKET="$(scas_floci_bucket_for_scenario 23)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
scas_floci_s3_put_string "$BUCKET" "ecr/compromised-trivy-${TS}.json" <<< '{"image":"aquasec/trivy:0.69.4","note":"simulated malicious release"}'
scas_floci_logs_put "/scas/sc23/trivy-action" "ci-run" "Malicious trivy-action v0.69.4 simulated credential harvest"

echo "[FLOCI] Scenario 23 ECR/S3 markers written for compromised Trivy release"
