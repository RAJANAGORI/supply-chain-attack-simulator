#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

BUCKET="$(scas_floci_seed_scenario 11)"
REPO="$(scas_floci_ecr_repo_for_scenario 11)"
scas_floci_ecr_create "$REPO"
scas_floci_s3_put_string "$BUCKET" "baseline/status.txt" <<< "npm/mirror baseline"
scas_floci_s3_put_string "$BUCKET" "mirror/tarballs/.keep" <<< "enterprise mirror tarball index"

echo "✅ Floci seeded for scenario 11"
echo "   Bucket: s3://${BUCKET}"
echo "   ECR (container mirror analog): $(scas_floci_ecr_uri "$REPO")"
