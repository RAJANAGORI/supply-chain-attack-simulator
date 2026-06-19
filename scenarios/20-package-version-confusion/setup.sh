#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCENARIO_DIR}"
# shellcheck disable=SC1091
source "${SCENARIO_DIR}/../_shared/enable-testbench.sh"

set -euo pipefail


echo "================================================"
echo "🔧 Scenario 20: Package Version Confusion"
echo "================================================"
echo ""

mkdir -p infrastructure victim-app
echo '{"captures": []}' > infrastructure/captured-data.json
rm -rf victim-app/node_modules

cat <<'EOF'
================================================
🎯 Next Steps:
1) Start mock server (Terminal A):
   node infrastructure/mock-server.js

2) Run victim version-confusion simulation (Terminal B):
   cd victim-app
   rm -rf node_modules package-lock.json
   npm install
   npm start

3) Detection (from scenario root):
   node detection-tools/version-confusion-detector.js victim-app

4) Review evidence:
   curl -s http://127.0.0.1:3020/captured-data

5) Cleanup:
   ../../scripts/kill-port.sh 3020
================================================
EOF
