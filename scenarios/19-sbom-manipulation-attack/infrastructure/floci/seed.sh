#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
SCENARIO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

BUCKET="$(scas_floci_seed_scenario 19)"
TRUTH="${SCENARIO_ROOT}/truth/dependencies.json"
SBOM_SAMPLE="${SCENARIO_ROOT}/victim-app/sbom.json"

scas_floci_s3_put_string "$BUCKET" "baseline/status.txt" <<< "sbom/baseline"
if [ -f "$TRUTH" ]; then
  scas_floci_s3_put "$BUCKET" "truth/dependencies.json" "$TRUTH"
else
  scas_floci_s3_put_string "$BUCKET" "truth/dependencies.json" <<< '["legit-lib","malicious-lib"]'
fi
scas_floci_s3_put_string "$BUCKET" "sbom/generated-placeholder.json" <<< '{"dependencies":["legit-lib"],"_note":"omits malicious-lib"}'
scas_floci_aws glue create-database --database-input '{"Name":"scas_sc19_sbom","Description":"SCAS scenario 19 SBOM catalog"}' >/dev/null 2>&1 || true
scas_floci_ssm_put_parameter "/scas/sc19/athena-workgroup" "scas-sc19-sbom"
scas_floci_aws config describe-configuration-recorders >/dev/null 2>&1 || true

echo "✅ Floci seeded for scenario 19"
echo "   Bucket: s3://${BUCKET}"
echo "   Glue DB: scas_sc19_sbom"
echo "   Compare: s3://${BUCKET}/truth/ vs s3://${BUCKET}/sbom/ vs victim sbom.json"
