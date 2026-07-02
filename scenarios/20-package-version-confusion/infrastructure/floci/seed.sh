#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

BUCKET="$(scas_floci_seed_scenario 20)"
scas_floci_s3_put_string "$BUCKET" "baseline/status.txt" <<< "npm/version-confuser baseline"

echo "✅ Floci seeded for scenario 20"
echo "   Bucket: s3://${BUCKET}"
