#!/usr/bin/env bash
# Hunt emulated CloudTrail-style API activity on Floci (scenarios 05, 23).
set -euo pipefail

SCENARIO_ID="${1:-23}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=../../scripts/floci-bridge.sh
source "${ROOT}/scripts/floci-bridge.sh"

scas_floci_require
BUCKET="$(scas_floci_bucket_for_scenario "$SCENARIO_ID")"

echo "🔍 CloudTrail hunt — scenario ${SCENARIO_ID}"
echo "   Look for: PutObject on s3://${BUCKET}/, AssumeRole, ecr:PutImage, codepipeline:*"
echo ""

FOUND=0
if scas_floci_aws s3 ls "s3://${BUCKET}/exfil/" 2>/dev/null | grep -q .; then
  echo "⚠️  S3 exfil prefix has objects (PutObject indicator)"
  scas_floci_aws s3 ls "s3://${BUCKET}/exfil/" 2>/dev/null || true
  FOUND=1
fi

if scas_floci_aws sts get-caller-identity >/dev/null 2>&1; then
  echo "ℹ️  STS GetCallerIdentity:"
  scas_floci_aws sts get-caller-identity 2>/dev/null || true
fi

REPO="$(scas_floci_ecr_repo_for_scenario "$SCENARIO_ID")"
COUNT="$(scas_floci_aws ecr describe-images --repository-name "$REPO" --query 'length(imageDetails)' --output text 2>/dev/null || echo 0)"
if [ "${COUNT}" != "0" ] && [ "${COUNT}" != "None" ]; then
  echo "⚠️  ECR repo ${REPO} has ${COUNT} image(s)"
  FOUND=1
fi

[ "$FOUND" -eq 0 ] && echo "✅ No obvious cloud abuse artifacts yet."
exit "$FOUND"
