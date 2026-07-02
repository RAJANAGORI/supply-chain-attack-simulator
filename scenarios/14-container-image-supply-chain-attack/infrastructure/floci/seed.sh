#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

BUCKET="$(scas_floci_seed_scenario 14)"
REPO="$(scas_floci_ecr_repo_for_scenario 14)"
scas_floci_ecr_create "$REPO"
scas_floci_ecs_create_cluster "scas-sc14"
scas_floci_ecs_register_task "scas-sc14-compromised" "$(scas_floci_ecr_uri "$REPO"):compromised"
scas_floci_s3_put_string "$BUCKET" "baseline/image-trust.txt" <<< "Legitimate image tag: scas-legit"

echo "✅ Floci seeded for scenario 14"
echo "   S3: s3://${BUCKET}"
echo "   ECR: $(scas_floci_ecr_uri "$REPO")"
echo "   ECS cluster: scas-sc14"
