#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci/floci-bridge.sh"

BUCKET="$(scas_floci_seed_scenario 25)"
scas_floci_s3_put_string "$BUCKET" "baseline/workflows/checkout.yml" <<< "Trusted checkout action workflow baseline"

echo "Floci seeded for scenario 25"
echo "   S3: s3://${BUCKET}"
