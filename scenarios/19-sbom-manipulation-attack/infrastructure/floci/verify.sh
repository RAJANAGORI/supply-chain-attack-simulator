#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

scas_floci_require
BUCKET="$(scas_floci_bucket_for_scenario 19)"

echo "=== Floci SBOM analytics — scenario 19 ==="
echo "--- truth/ (ground inventory) ---"
scas_floci_s3_ls "$BUCKET" "truth/" || true
echo "--- sbom/ (generated inventory) ---"
scas_floci_s3_ls "$BUCKET" "sbom/" || true
echo "--- exfil/ ---"
scas_floci_s3_ls "$BUCKET" "exfil/" || true
echo "--- Glue catalog ---"
scas_floci_aws glue get-database --name scas_sc19_sbom --query 'Database.Name' --output text 2>/dev/null || echo "(not seeded)"
echo ""
echo "IOC: mismatch between truth/ and sbom/ prefixes indicates SBOM manipulation."
