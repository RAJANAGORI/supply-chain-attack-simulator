#!/bin/bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
# Scenario 24: Slopsquatting (LLM-hallucinated package names) — Setup Script
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCENARIO_DIR}"
# shellcheck disable=SC1091
source "${SCENARIO_DIR}/../_shared/enable-testbench.sh"

set -euo pipefail

echo "================================================"
echo "Scenario 24: Slopsquatting"
echo "  LLM-hallucinated package name -> malicious package"
echo "================================================"
echo ""

command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install Node.js 16+"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "npm is required."; exit 1; }

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""

# Create directory structure if missing
echo "Creating directory structure..."
mkdir -p infrastructure detection-tools
echo "Directories created"
echo ""

# Reset capture log
echo '{"captures":[]}' > infrastructure/captured-data.json
echo "Capture log reset: infrastructure/captured-data.json"
echo ""

# Install victim application dependencies
echo "Setting up victim application..."
cd victim-app
rm -rf node_modules package-lock.json
npm install --ignore-scripts
cd ..
echo "Victim dependencies installed"
echo ""

echo "================================================"
echo "Setup complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Terminal A - Start the mock attacker server:"
echo "   node infrastructure/mock-server.js"
echo ""
echo "2. Terminal B - Run the victim application:"
echo "   cd victim-app"
echo "   npm start"
echo ""
echo "3. Verify exfiltration:"
echo "   curl -s http://127.0.0.1:3024/captured-data"
echo ""
echo "4. Run detection:"
echo "   node detection-tools/slopsquat-detector.js victim-app"
echo ""
echo "Full instructions: cat README.md"
echo ""
