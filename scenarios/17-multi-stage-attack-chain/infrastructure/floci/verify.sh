#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

scas_floci_require
BUCKET="$(scas_floci_bucket_for_scenario 17)"

echo "=== Floci kill-chain — scenario 17 ==="
echo "--- chain/ (stage markers) ---"
scas_floci_s3_ls "$BUCKET" "chain/" || echo "(empty)"
echo "--- exfil/ ---"
scas_floci_s3_ls "$BUCKET" "exfil/" || true
