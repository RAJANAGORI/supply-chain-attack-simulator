#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCENARIO_DIR}"
# shellcheck disable=SC1091
source "${SCENARIO_DIR}/../_shared/enable-testbench.sh"

set -euo pipefail

echo "================================================"
echo "🔧 Scenario 19: SBOM Manipulation Attack"
echo "================================================"
echo ""

mkdir -p infrastructure victim-app
echo '{"captures": []}' > infrastructure/captured-data.json

cat <<'EOF'
================================================
🎯 Next Steps:
1) Start mock server (Terminal A):
   node infrastructure/mock-server.js

2) Generate manipulated SBOM (Terminal B):
   cd victim-app
   rm -rf node_modules package-lock.json
   npm install
   npm start

3) Detection (from scenario root):
   node detection-tools/sbom-manipulation-validator.js victim-app

4) Review evidence:
   curl -s http://127.0.0.1:3019/captured-data

5) Cleanup:
   ../../scripts/kill-port.sh 3019
================================================
EOF

