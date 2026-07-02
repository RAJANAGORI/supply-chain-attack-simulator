#!/usr/bin/env bash
# Seed Floci S3 for Scenario 05 — legitimate baseline artifact before compromise.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
SCENARIO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

SCENARIO_ID=05
BUCKET="$(scas_floci_seed_scenario "$SCENARIO_ID")"

LEGIT="${SCENARIO_ROOT}/legitimate-build/dist"
mkdir -p "$LEGIT"
cat >"${LEGIT}/manifest.json" <<'EOF'
{
  "version": "1.0.0",
  "buildSystem": "legitimate",
  "note": "Baseline artifact — compare after compromised build exfil"
}
EOF

scas_floci_s3_put "$BUCKET" "releases/legitimate/manifest.json" "${LEGIT}/manifest.json"

scas_floci_iam_create_role "scas-sc05-codebuild-role"
scas_floci_logs_put "/scas/sc05/build" "compromised-run" "CodeBuild-style env harvest simulated"
scas_floci_ssm_put_parameter "/scas/sc05/ci-database-url" "postgres://decoy:decoy@127.0.0.1:5432/ci"

echo "✅ Floci seeded for scenario 05"
echo "   Bucket: s3://${BUCKET}"
echo "   Baseline: s3://${BUCKET}/releases/legitimate/manifest.json"
