#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

echo "================================================"
echo "🔧 Scenario 19: SBOM Manipulation Attack"
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

REPO_ROOT="$(cd "${ROOT_DIR}/../.." && pwd)"
if [[ -f "${REPO_ROOT}/.testbench.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO_ROOT}/.testbench.env"
  set +a
fi
export TESTBENCH_MODE=enabled

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
echo ""
echo "TESTBENCH_MODE=enabled for this shell. victim-app npm start enables it automatically."
