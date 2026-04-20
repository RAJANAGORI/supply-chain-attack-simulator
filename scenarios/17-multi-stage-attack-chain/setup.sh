#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

echo "================================================"
echo "🔧 Scenario 17: Multi-Stage Attack Chain"
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
echo "[]" > infrastructure/captured-data.json
rm -rf victim-app/node_modules

cat <<'EOF'
================================================
🎯 Next Steps:
1) Start mock server (Terminal A):
   node infrastructure/mock-server.js

2) Install stage packages into victim-app (Terminal B):
   cd victim-app
   rm -rf node_modules package-lock.json
   npm install ../packages/stage1-access-lib ../packages/stage2-compromised-lib

3) Run victim:
   npm start

4) Detection (from scenario root):
   node detection-tools/multi-stage-correlator.js .

5) Review evidence:
   curl -s http://127.0.0.1:3017/captured-data

6) Cleanup:
   ../../scripts/kill-port.sh 3017
================================================
EOF
