#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

BUCKET="$(scas_floci_seed_scenario 23)"
REPO="$(scas_floci_ecr_repo_for_scenario 23)"
PIPELINE="scas-sc23-pipeline"

scas_floci_ecr_create "$REPO"
scas_floci_iam_create_role "scas-sc23-ci-role"
scas_floci_s3_put_string "$BUCKET" "baseline/trivy-tags.txt" <<< "Legitimate trivy-action tags before force-push"
scas_floci_s3_put_string "$BUCKET" "source.zip" <<< "pipeline-source-placeholder"
scas_floci_codepipeline_create "$PIPELINE" "$BUCKET"
scas_floci_ssm_put_parameter "/scas/sc23/github-pat" "decoy-pat-for-lab-only"

echo "✅ Floci seeded for scenario 23 (capstone cloud track)"
echo "   S3: s3://${BUCKET}"
echo "   ECR: $(scas_floci_ecr_uri "$REPO")"
echo "   Pipeline: ${PIPELINE}"
