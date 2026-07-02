#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

scas_floci_require
BUCKET="$(scas_floci_bucket_for_scenario 23)"
REPO="$(scas_floci_ecr_repo_for_scenario 23)"

echo "=== Floci evidence — scenario 23 (Trivy capstone) ==="
echo "--- S3 exfil ---"
scas_floci_s3_ls "$BUCKET" "exfil/" || true
echo "--- ECR images ---"
scas_floci_aws ecr describe-images --repository-name "$REPO" --output table 2>/dev/null || echo "(no images)"
echo "--- STS identity ---"
scas_floci_sts_get_caller 2>/dev/null || true
echo "--- Blue-team scripts ---"
echo "  ../../detection-tools/floci/cloudtrail-hunt.sh 23"
echo "  ../../detection-tools/floci/pipeline-artifact-check.sh 23"
echo "  ../../detection-tools/floci/ecr-check.sh 23"
