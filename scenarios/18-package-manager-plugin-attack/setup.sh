#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCENARIO_DIR}"
# shellcheck disable=SC1091
source "${SCENARIO_DIR}/../_shared/enable-testbench.sh"

set -euo pipefail


echo "================================================"
echo "🔧 Scenario 18: Package Manager Hook Abuse (pnpm .pnpmfile.cjs)"
echo "================================================"
echo ""

mkdir -p infrastructure victim-app
rm -rf victim-app/node_modules victim-app/pnpm-lock.yaml

echo '{"captures": []}' > infrastructure/captured-data.json

cat <<'EOF'
================================================
🎯 Next Steps:
1) Start mock server (Terminal A):
   node infrastructure/mock-server.js

2) Install dependencies with pnpm (Terminal B):
   cd victim-app
   export TESTBENCH_MODE=enabled
   npx pnpm@9.15.9 install

3) Run the victim app:
   npm start

4) Detection (from scenario root):
   node detection-tools/plugin-attack-detector.js victim-app

5) Review evidence:
   curl -s http://127.0.0.1:3018/captured-data

6) Cleanup:
   ../../scripts/setup/kill-port.sh 3018
================================================
EOF
