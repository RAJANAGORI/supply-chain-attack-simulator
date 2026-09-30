#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
# Scenario 5: GitHub Actions workflow injection - Setup Script
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCENARIO_DIR}"
# shellcheck disable=SC1091
source "${SCENARIO_DIR}/../_shared/enable-testbench.sh"

set -euo pipefail

echo "================================================"
echo "Setting up GitHub Actions Workflow Injection"
echo "Scenario 5: Build Compromise"
echo "================================================"
echo ""

command -v node >/dev/null 2>&1 || { echo "Node.js is not installed. Please install Node.js 16+"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is not installed."; exit 1; }

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
if command -v act >/dev/null 2>&1; then
  echo "nektos/act: $(act --version 2>/dev/null | head -1) (will run build.yml)"
else
  echo "nektos/act: not found (lab falls back to npm run ci)"
  echo "  Optional: brew install act"
fi
echo ""

chmod +x "${SCENARIO_DIR}/run-ci.sh" "${SCENARIO_DIR}/../_shared/run-act.sh"

echo "Creating directory structure..."
mkdir -p victim-app/.github/workflows
mkdir -p malicious-action
mkdir -p infrastructure
mkdir -p detection-tools
echo "Directories created"
echo ""

echo "Resetting capture log..."
echo '{"captures":[]}' > infrastructure/captured-data.json
echo "Capture log reset"
echo ""

bash "${SCENARIO_DIR}/../_shared/plant-lookalike-secrets.sh" 05
echo "Lookalike CI secrets planted (victim-app/.env.lab)"
echo ""

echo "================================================"
echo "Setup complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the mock attacker server:"
echo "   node infrastructure/mock-server.js &"
echo ""
echo "2. Review the victim workflow:"
echo "   cat victim-app/.github/workflows/build.yml"
echo ""
echo "3. Review the compromised action:"
echo "   cat malicious-action/action.yml"
echo "   cat malicious-action/index.js"
echo ""
echo "4. Source the lab secrets and run the CI workflow:"
echo "   export TESTBENCH_MODE=enabled"
echo "   ./run-ci.sh"
echo "   (act runs build.yml when installed; otherwise npm run ci)"
echo ""
echo "5. Verify exfiltration:"
echo "   curl http://127.0.0.1:3000/captured-data"
echo ""
echo "6. Run the detector:"
echo "   node detection-tools/workflow-injection-scanner.js victim-app"
echo ""
echo "Full instructions: cat README.md"
echo ""
