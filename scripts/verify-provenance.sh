#!/usr/bin/env bash
# Verify SCAS authorship fingerprints in a checkout (yours or a suspect copy).
# Usage: ./scripts/verify-provenance.sh [directory]

set -euo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
FP="SCAS-FP-RN-8d4f2c9a1e7b3065"
CANON="${ROOT}/SCAS_PROVENANCE.json"

echo "Checking SCAS provenance in: ${ROOT}"
echo "Expected fingerprint: ${FP}"
echo ""

if [[ ! -f "${CANON}" ]]; then
  echo "MISSING canonical file: SCAS_PROVENANCE.json"
  exit 1
fi

MATCHES=$(grep -r --exclude-dir=.git --exclude-dir=node_modules -l "${FP}" "${ROOT}" 2>/dev/null || true)
COUNT=$(echo "${MATCHES}" | sed '/^$/d' | wc -l | tr -d ' ')

echo "Files containing fingerprint (${COUNT}):"
echo "${MATCHES}" | sed '/^$/d' | sed 's/^/  /'
echo ""

if [[ "${COUNT}" -lt 3 ]]; then
  echo "WARNING: fewer than 3 fingerprint hits — attribution may have been stripped."
  exit 2
fi

echo "Canonical record:"
grep -E '"creator"|"fingerprint"|"repository"' "${CANON}" | sed 's/^/  /'
echo ""
echo "If a copy lacks SCAS_PROVENANCE.json or these markers, compare git history and see LEGAL.md."
