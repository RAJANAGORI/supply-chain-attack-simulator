#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

BUCKET="$(scas_floci_seed_scenario 17)"
for stage in stage1 stage2 stage3; do
  scas_floci_s3_put_string "$BUCKET" "chain/${stage}/.keep" <<< "awaiting ${stage} evidence"
done

SFN_DEF='{"Comment":"SCAS scenario 17 kill chain","StartAt":"Stage1","States":{"Stage1":{"Type":"Pass","Result":{"stage":1},"Next":"Stage2"},"Stage2":{"Type":"Pass","Result":{"stage":2},"Next":"Stage3"},"Stage3":{"Type":"Succeed"}}}'
scas_floci_stepfunctions_create "scas-sc17-chain" "$SFN_DEF"
scas_floci_eventbridge_put "scas.chain.stage" "{\"scenario\":\"17\",\"stages\":[\"stage1\",\"stage2\",\"stage3\"]}"

echo "✅ Floci seeded for scenario 17"
echo "   Bucket: s3://${BUCKET}/chain/"
echo "   Step Functions: scas-sc17-chain"
