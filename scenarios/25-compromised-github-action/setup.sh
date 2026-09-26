#!/bin/bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
# Scenario 25: Compromised Reusable GitHub Action — Setup Script
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCENARIO_DIR}"
# shellcheck disable=SC1091
source "${SCENARIO_DIR}/../_shared/enable-testbench.sh"

set -euo pipefail

echo "================================================"
echo "Scenario 25: Compromised Reusable GitHub Action"
echo "  Force-pushed tag -> CI secret exfiltration"
echo "================================================"
echo ""

command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install Node.js 16+"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "npm is required."; exit 1; }

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
if command -v act >/dev/null 2>&1; then
  echo "nektos/act: $(act --version 2>/dev/null | head -1) (will run ci.yml)"
else
  echo "nektos/act: not found (lab falls back to npm start)"
  echo "  Optional: brew install act"
fi
echo ""

chmod +x "${SCENARIO_DIR}/run-ci.sh" "${SCENARIO_DIR}/../_shared/run-act.sh"

# Create directory structure if missing
echo "Creating directory structure..."
mkdir -p infrastructure detection-tools
echo "Directories created"
echo ""

# Reset capture log
echo '{"captures":[]}' > infrastructure/captured-data.json
echo "Capture log reset: infrastructure/captured-data.json"
echo ""

# Plant lookalike CI secrets for the harvest demo
echo "Planting lookalike CI secrets (.env.ci-lab)..."
SHARED_DIR="${SCENARIO_DIR}/../_shared"
LOOKALIKE_ENV="${SHARED_DIR}/lookalike-secrets.env"
if [ -f "${LOOKALIKE_ENV}" ]; then
    GITHUB_TOKEN="$(grep -E '^export GITHUB_TOKEN=' "${LOOKALIKE_ENV}" | head -1 | sed 's/^export GITHUB_TOKEN=//')"
    AWS_ACCESS_KEY_ID="$(grep -E '^export AWS_ACCESS_KEY_ID=' "${LOOKALIKE_ENV}" | head -1 | sed 's/^export AWS_ACCESS_KEY_ID=//')"
    AWS_SECRET_ACCESS_KEY="$(grep -E '^export AWS_SECRET_ACCESS_KEY=' "${LOOKALIKE_ENV}" | head -1 | sed 's/^export AWS_SECRET_ACCESS_KEY=//')"
    DATABASE_URL="$(grep -E '^export DATABASE_URL=' "${LOOKALIKE_ENV}" | head -1 | sed 's/^export DATABASE_URL=//')"
    DOCKER_USERNAME="$(grep -E '^export DOCKER_USERNAME=' "${LOOKALIKE_ENV}" | head -1 | sed 's/^export DOCKER_USERNAME=//')"
    DOCKER_PASSWORD="$(grep -E '^export DOCKER_PASSWORD=' "${LOOKALIKE_ENV}" | head -1 | sed 's/^export DOCKER_PASSWORD=//')"

    cat > .env.ci-lab <<EOF
# LAB ONLY - source before running the compromised action harvest
GITHUB_TOKEN=${GITHUB_TOKEN}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
DATABASE_URL=${DATABASE_URL}
DOCKER_USERNAME=${DOCKER_USERNAME}
DOCKER_PASSWORD=${DOCKER_PASSWORD}
EOF
    echo "Lookalike CI secrets planted"
else
    echo "Lookalike secrets file not found; simulation will use placeholders"
fi
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
echo "2. Terminal B - Source lookalike secrets and run the CI workflow:"
echo "   export TESTBENCH_MODE=enabled"
echo "   ./run-ci.sh"
echo "   (act runs ci.yml when installed; otherwise npm start)"
echo ""
echo "3. Verify exfiltration:"
echo "   curl -s http://127.0.0.1:3025/captured-data"
echo ""
echo "4. Run detection:"
echo "   node detection-tools/action-compromise-detector.js victim-app"
echo ""
echo "Full instructions: cat README.md"
echo ""
