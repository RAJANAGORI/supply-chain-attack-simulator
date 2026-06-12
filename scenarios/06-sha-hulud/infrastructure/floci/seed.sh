#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

BUCKET="$(scas_floci_seed_scenario 06)"
scas_floci_secret_put "scas/sc06/decoy-npm-token" '{"_authToken":"decoy-npm-token-for-lab"}'
scas_floci_s3_put_string "$BUCKET" "baseline/README.txt" <<< "Scenario 06 — no exfil objects before attack"

echo "✅ Floci seeded for scenario 06"
echo "   Bucket: s3://${BUCKET}"
echo "   Secret: scas/sc06/decoy-npm-token"
