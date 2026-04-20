#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

echo "================================================"
echo "🧾 Scenario 13: Package Metadata Manipulation"
echo "================================================"
echo ""

if [[ "${TESTBENCH_MODE:-}" != "enabled" ]]; then
  echo "⚠️  TESTBENCH_MODE is not enabled."
  echo "Run: export TESTBENCH_MODE=enabled"
  echo ""
  read -r -p "Continue anyway? (y/N): " REPLY
  if [[ ! "${REPLY}" =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

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

