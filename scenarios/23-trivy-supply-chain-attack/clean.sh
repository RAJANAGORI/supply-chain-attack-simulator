#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
# Scenario 23: Trivy Supply Chain Attack — Cleanup Script
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCENARIO_DIR}"

set -euo pipefail

echo "🧹 Cleaning up Scenario 23..."

rm -rf victim-ci/node_modules victim-ci/package-lock.json
echo '{"captures":[]}' > infrastructure/captured-data.json

echo "✅ Cleanup complete."
echo "   - victim-ci/node_modules removed"
echo "   - infrastructure/captured-data.json cleared"
