#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

echo "================================================"
echo "🔧 Scenario 20: Package Version Confusion"
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
