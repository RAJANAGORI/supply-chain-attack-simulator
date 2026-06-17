#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

BUCKET="$(scas_floci_seed_scenario 21)"
scas_floci_secret_put "scas/sc21/ci-aws-role" '{"note":"ambient CI credentials simulation"}'
scas_floci_s3_put_string "$BUCKET" "npm/baseline.txt" <<< "axios-like@1.14.0 clean release"

echo "✅ Floci seeded for scenario 21"
echo "   Bucket: s3://${BUCKET}"
