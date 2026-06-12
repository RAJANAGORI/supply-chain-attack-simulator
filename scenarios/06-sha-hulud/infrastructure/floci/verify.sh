#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

scas_floci_require
BUCKET="$(scas_floci_bucket_for_scenario 06)"

echo "=== Floci evidence — scenario 06 (Shai-Hulud) ==="
echo "Bucket: s3://${BUCKET}"
scas_floci_s3_ls "$BUCKET" "exfil/" || echo "(no exfil/)"
echo ""
echo "Secrets (harvested tokens may appear as new secret versions in advanced labs):"
scas_floci_aws secretsmanager list-secrets --query 'SecretList[?contains(Name, `scas`)].Name' --output text 2>/dev/null || true
