#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

echo "================================================"
echo "🔧 Scenario 16: Package Cache Poisoning"
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

mkdir -p infrastructure victim-app
echo '{"captures": []}' > infrastructure/captured-data.json
rm -rf victim-app/node_modules

cat <<'EOF'
================================================
🎯 Next Steps:
1) Start mock server (Terminal A):
   node infrastructure/mock-server.js

2) Install victim app dependencies (Terminal B):
   cd victim-app
   rm -rf node_modules package-lock.json
   npm install

3) Reinstall again to demonstrate persistence across reinstalls:
   rm -rf node_modules package-lock.json
   npm install

4) Run victim app:
   npm start

5) Detection (from scenario root):
   node detection-tools/cache-poisoning-detector.js victim-app

6) Review evidence:
   curl -s http://127.0.0.1:3016/captured-data

7) Cleanup:
   ../../scripts/kill-port.sh 3016
================================================
EOF
