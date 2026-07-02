#!/usr/bin/env bash
# Verify EventBridge + S3 chain markers for scenario 17.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=../../scripts/floci-bridge.sh
source "${ROOT}/scripts/floci-bridge.sh"

scas_floci_require
BUCKET="$(scas_floci_bucket_for_scenario 17)"
RULE="scas-sc17-chain"

echo "🔍 EventBridge chain check — scenario 17"
MISSING=0
for stage in stage1 stage2 stage3; do
  if scas_floci_aws s3 ls "s3://${BUCKET}/chain/" 2>/dev/null | grep -qE "${stage}.*\.json"; then
    echo "✅ chain/${stage}-* present"
  else
    echo "⚠️  chain/${stage}-* missing"
    MISSING=1
  fi
done

if scas_floci_aws events list-rules --name-prefix "$RULE" --query 'Rules[0].Name' --output text 2>/dev/null | grep -q "$RULE"; then
  echo "✅ EventBridge rule ${RULE} registered"
else
  echo "ℹ️  EventBridge rule ${RULE} not found (optional — run extended seed)"
fi

[ "$MISSING" -eq 0 ] || exit 1
exit 0
