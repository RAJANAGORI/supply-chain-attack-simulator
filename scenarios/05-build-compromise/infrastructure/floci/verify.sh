#!/usr/bin/env bash
# Blue-team: list Floci S3 evidence for scenario 05.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

scas_floci_require
BUCKET="$(scas_floci_bucket_for_scenario 05)"

echo "=== Floci S3 evidence — scenario 05 ==="
echo "Bucket: s3://${BUCKET}"
echo ""
echo "--- exfil/ (stolen build secrets) ---"
scas_floci_s3_ls "$BUCKET" "exfil/" || echo "(empty)"
echo ""
echo "--- releases/ (build artifacts) ---"
scas_floci_s3_ls "$BUCKET" "releases/" || echo "(empty)"
echo ""
echo "Download example:"
echo "  scas_floci_aws s3 cp s3://${BUCKET}/exfil/ ./evidence/ --recursive"
