#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci/floci-bridge.sh"

BUCKET="$(scas_floci_seed_scenario 24)"
scas_floci_s3_put_string "$BUCKET" "baseline/README.md" <<< "LLM-generated package recommendation baseline"

echo "Floci seeded for scenario 24"
echo "   S3: s3://${BUCKET}"
