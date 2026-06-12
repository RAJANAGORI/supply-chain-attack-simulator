#!/usr/bin/env bash
# Upload JSON payload to Floci S3 — used by Node payloads and shell exfil scripts.
# Usage: echo '{"k":1}' | floci-upload-json.sh <scenario-id> <key-suffix>
set -euo pipefail

SCENARIO_ID="${1:?scenario id}"
KEY_SUFFIX="${2:?key suffix}"
PREFIX="${3:-exfil}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=floci-bridge.sh
source "${SCRIPT_DIR}/floci-bridge.sh"

[ "${TESTBENCH_MODE:-}" = "enabled" ] || exit 0
[ "${SCAS_FLOCI_ENABLED:-}" = "1" ] || exit 0

scas_floci_require || exit 0
BUCKET="$(scas_floci_bucket_for_scenario "$SCENARIO_ID")"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
KEY="${PREFIX}/${KEY_SUFFIX}-${TS}.json"

scas_floci_s3_put_string "$BUCKET" "$KEY"
echo "[FLOCI] Uploaded s3://${BUCKET}/${KEY}" >&2
