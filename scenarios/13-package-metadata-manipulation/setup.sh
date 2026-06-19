#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCENARIO_DIR}"
# shellcheck disable=SC1091
source "${SCENARIO_DIR}/../_shared/enable-testbench.sh"

set -euo pipefail

echo "================================================"
echo "🧾 Scenario 13: Package Metadata Manipulation"
echo "================================================"
echo ""

mkdir -p legitimate-packages/clean-utils compromised-packages/clean-utils victim-app infrastructure detection-tools
echo "[]" > infrastructure/captured-data.json
rm -rf victim-app/node_modules/clean-utils

echo "✅ Environment prepared."
echo ""
cat <<'EOF'
Next steps:

1) Start mock server (Terminal A)
   node infrastructure/mock-server.js

2) Install compromised package (Terminal B)
   cd victim-app
   npm install ../compromised-packages/clean-utils
   TESTBENCH_MODE=enabled node index.js

3) Validate package metadata (from scenario root)
   node detection-tools/metadata-validator.js victim-app/node_modules/clean-utils

4) Review capture data
   curl -s http://127.0.0.1:3001/captured-data

5) Cleanup
   ../../scripts/kill-port.sh 3001
EOF

