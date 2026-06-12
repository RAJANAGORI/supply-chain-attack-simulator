#!/usr/bin/env bash
# Detect unexpected objects in Floci S3 for a SCAS scenario bucket.
set -euo pipefail

SCENARIO_ID="${1:?usage: s3-exfil-check.sh <scenario-id> e.g. 05}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=../../scripts/floci-bridge.sh
source "${ROOT}/scripts/floci-bridge.sh"

scas_floci_require
BUCKET="$(scas_floci_bucket_for_scenario "$SCENARIO_ID")"

echo "🔍 Floci S3 exfil check — scenario ${SCENARIO_ID}"
echo "   Bucket: s3://${BUCKET}"
echo ""

FOUND=0
while IFS= read -r line; do
  [ -z "$line" ] && continue
  echo "⚠️  $line"
  FOUND=1
done < <(scas_floci_aws s3 ls "s3://${BUCKET}/exfil/" 2>/dev/null || true)

if [ "$FOUND" -eq 0 ]; then
  echo "✅ No objects under exfil/ (or bucket not yet attacked)."
  exit 0
fi

echo ""
echo "IOC: build-time secrets uploaded to emulated S3 — investigate CI credential scope."
exit 1
