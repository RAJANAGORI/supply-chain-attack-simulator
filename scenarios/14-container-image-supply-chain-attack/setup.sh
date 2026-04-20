#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

echo "================================================"
echo "🐳 Scenario 14: Container Image Supply Chain Attack"
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

mkdir -p images/legitimate-image images/compromised-image victim-app infrastructure detection-tools
echo "[]" > infrastructure/captured-data.json

echo "✅ Environment prepared."
echo ""
cat <<'EOF'
Next steps:

1) Start mock server (Terminal A)
   node infrastructure/mock-server.js

2) Static scan the compromised image definition (Terminal B)
   node detection-tools/image-scanner.js images/compromised-image

3) Optional runtime simulation without Docker (Terminal B)
   TESTBENCH_MODE=enabled node images/compromised-image/malicious-start.js
   curl -s http://127.0.0.1:3002/captured-data

4) Optional Docker compare (if Docker is installed)
   docker build -t scas-legit images/legitimate-image
   docker build -t scas-compromised images/compromised-image
   docker run --rm -e TESTBENCH_MODE=enabled scas-compromised

5) Cleanup
   ../../scripts/kill-port.sh 3002
EOF

