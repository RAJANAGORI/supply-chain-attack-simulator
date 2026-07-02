#!/usr/bin/env bash
# Detect unexpected Secrets Manager reads for SCAS scenarios (06, 10, 15).
set -euo pipefail

SECRET_NAME="${1:?usage: secrets-check.sh <secret-name> e.g. scas/sc06/decoy-npm-token}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=../../scripts/floci-bridge.sh
source "${ROOT}/scripts/floci-bridge.sh"

scas_floci_require
echo "🔍 Secrets Manager check — ${SECRET_NAME}"
if scas_floci_aws secretsmanager describe-secret --secret-id "$SECRET_NAME" >/dev/null 2>&1; then
  echo "⚠️  Secret exists — verify access logs if harvest payload referenced it."
  scas_floci_aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --query 'Name' --output text 2>/dev/null || true
  exit 1
fi
echo "✅ Secret not found (seed may be missing)."
exit 0
