#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

scas_floci_require
BUCKET="$(scas_floci_bucket_for_scenario 14)"
REPO="$(scas_floci_ecr_repo_for_scenario 14)"

echo "=== Floci evidence — scenario 14 (container) ==="
scas_floci_s3_ls "$BUCKET" "exfil/" || true
scas_floci_s3_ls "$BUCKET" "ecr/" || true
echo ""
echo "ECR images:"
scas_floci_aws ecr describe-images --repository-name "$REPO" 2>/dev/null || echo "(no images — run push-compromised.sh)"
