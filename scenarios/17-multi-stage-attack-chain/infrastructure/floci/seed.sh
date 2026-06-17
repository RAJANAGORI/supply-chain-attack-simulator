#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

BUCKET="$(scas_floci_seed_scenario 17)"
for stage in stage1 stage2 stage3; do
  scas_floci_s3_put_string "$BUCKET" "chain/${stage}/.keep" <<< "awaiting ${stage} evidence"
done

echo "✅ Floci seeded for scenario 17"
echo "   Bucket: s3://${BUCKET}/chain/"
