#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

BUCKET="$(scas_floci_seed_scenario 22)"
scas_floci_s3_put_string "$BUCKET" "baseline/status.txt" <<< "pypi/litellm_like baseline"

echo "✅ Floci seeded for scenario 22"
echo "   Bucket: s3://${BUCKET}"
