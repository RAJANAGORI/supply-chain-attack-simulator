#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci/floci-bridge.sh"

scas_floci_require
BUCKET="$(scas_floci_bucket_for_scenario 24)"

echo "=== Floci evidence - scenario 24 (Slopsquatting) ==="
echo "--- S3 exfil ---"
scas_floci_s3_ls "$BUCKET" "exfil/" || true
echo ""
echo "--- Blue-team scripts ---"
echo "  ../../detection-tools/floci/s3-exfil-check.sh 24"
