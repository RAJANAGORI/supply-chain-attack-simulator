#!/usr/bin/env bash
# Verify multi-stage S3 markers exist for scenario 17.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=../../scripts/floci-bridge.sh
source "${ROOT}/scripts/floci-bridge.sh"

scas_floci_require
BUCKET="$(scas_floci_bucket_for_scenario 17)"
MISSING=0

for stage in stage1 stage2 stage3; do
  if scas_floci_aws s3 ls "s3://${BUCKET}/chain/" 2>/dev/null | grep -qE "${stage}.*\.json"; then
    echo "✅ chain/${stage}-* evidence present"
  else
    echo "⚠️  chain/${stage}-* missing JSON evidence"
    MISSING=1
  fi
done

[ "$MISSING" -eq 0 ] || exit 1
exit 0
