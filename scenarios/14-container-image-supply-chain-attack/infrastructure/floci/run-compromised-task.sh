#!/usr/bin/env bash
# Run compromised image as ECS task on Floci (scenario 14).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

[ "${TESTBENCH_MODE:-}" = "enabled" ] || exit 0
[ "${SCAS_FLOCI_ENABLED:-}" = "1" ] || exit 0

scas_floci_require || exit 0
scas_floci_ecs_run_task "scas-sc14" "scas-sc14-compromised"
echo "[FLOCI] ECS RunTask requested for scas-sc14-compromised (after ECR push)"
