#!/bin/bash
# Scenario 21: Axios-style compromised npm release (safe simulation)
set -e

echo "================================================"
echo "🔧 Scenario 21: Axios-style compromised release"
echo "================================================"
echo ""

if [ "${TESTBENCH_MODE:-}" != "enabled" ]; then
  echo "⚠️  TESTBENCH_MODE is not enabled"
  echo "   export TESTBENCH_MODE=enabled"
  echo ""
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo ""
  if [[ ! ${REPLY:-} =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

command -v node >/dev/null 2>&1 || { echo "❌ Node.js required"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm required"; exit 1; }

echo "📦 Packing axios-like@1.14.1 with bundled plain-crypto-js-like..."
echo "   (npm install --ignore-scripts here materializes node_modules for npm pack bundling.)"
(
  cd packages/axios-like-1.14.1
  rm -rf node_modules
  rm -f axios-like-*.tgz
  npm install --ignore-scripts
  npm pack .
  mv -f axios-like-*.tgz ..
)
echo "✅ Tarball: packages/axios-like-1.14.1.tgz"
echo ""

echo "📦 Installing victim app (clean axios-like@1.14.0)..."
cd victim-app
rm -rf node_modules package-lock.json
npm install
cd ..

chmod +x detection-tools/*.js 2>/dev/null || true

echo ""
echo "================================================"
echo "✅ Setup complete"
echo "================================================"
echo ""
echo "1) Terminal A — mock server:"
echo "   node infrastructure/mock-server.js"
echo ""
echo "2) Terminal B — simulate compromised patch (install packed release so deps execute):"
echo "   export TESTBENCH_MODE=enabled"
echo "   cd victim-app && npm install axios-like@file:../packages/axios-like-1.14.1.tgz"
echo ""
echo "3) Run victim:"
echo "   cd victim-app && npm start"
echo ""
echo "4) Inspect beacons:"
echo "   curl -s http://localhost:3021/captured-data | head"
echo ""
echo "5) Detection:"
echo "   node detection-tools/axios-compromise-detector.js victim-app"
echo ""
echo "Offline / CI (no HTTP): TESTBENCH_OFFLINE=1 npm install axios-like@file:../packages/axios-like-1.14.1.tgz"
echo "Full lab: cat README.md"
echo ""
