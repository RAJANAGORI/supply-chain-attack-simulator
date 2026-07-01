#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
# Scenario 23: Trivy Supply Chain Attack (CVE-2026-33634) — Setup Script
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCENARIO_DIR}"
# shellcheck disable=SC1091
source "${SCENARIO_DIR}/../_shared/enable-testbench.sh"

set -euo pipefail

echo "================================================"
echo "🔧 Scenario 23: Trivy Supply Chain Attack"
echo "   CVE-2026-33634 / TeamPCP campaign"
echo "================================================"
echo ""

command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install Node.js 16+"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "❌ npm is required."; exit 1; }

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Reset capture log
echo '{"captures":[]}' > infrastructure/captured-data.json
echo "✅ Capture log reset: infrastructure/captured-data.json"
echo ""

# Install victim-ci dependencies (pulls in the compromised trivy-action-like@0.69.4)
echo "📦 Installing victim-ci dependencies..."
echo "   (This installs the simulated malicious trivy-action-like@0.69.4)"
cd victim-ci
rm -rf node_modules package-lock.json
npm install --ignore-scripts
cd ..
echo "✅ Victim CI dependencies installed"
echo ""

echo "================================================"
echo "✅ Setup complete!"
echo "================================================"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Terminal A — Start the mock C2 server:"
echo "   node infrastructure/mock-c2-server.js"
echo ""
echo "2. Terminal B — Run the victim CI pipeline:"
echo "   export TESTBENCH_MODE=enabled"
echo "   cd victim-ci && node run-pipeline.js"
echo ""
echo "3. Verify exfiltration:"
echo "   curl -s http://127.0.0.1:3023/captured-data"
echo ""
echo "4. Run detection tools (from scenario root OR victim-ci):"
echo "   node detection-tools/trivy-version-scanner.js victim-ci"
echo "   node detection-tools/ci-workflow-auditor.js victim-ci"
echo "   # — or from victim-ci/ after the pipeline:"
echo "   npm run scan && npm run audit"
echo ""
echo "📖 Full instructions: cat README.md"
echo ""
