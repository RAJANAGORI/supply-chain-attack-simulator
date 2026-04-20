#!/bin/bash

# Main Setup Script for Supply Chain Attack Testbench
# This script prepares the entire environment
#
# Safe to run from any cwd: paths are resolved from the repo root (parent of this script).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"
TESTBENCH_ENV_FILE="${REPO_ROOT}/.testbench.env"

echo "========================================================="
echo "🔐 Supply Chain Attack Testbench - Setup"
echo "========================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check OS
echo "📋 Checking system requirements..."
echo ""

OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo -e "${BLUE}Operating System: ${MACHINE}${NC}"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."
echo ""

MISSING_DEPS=()

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    MISSING_DEPS+=("Node.js 16+")
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js: ${NODE_VERSION}${NC}"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    MISSING_DEPS+=("npm")
else
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm: ${NPM_VERSION}${NC}"
fi

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found${NC}"
    MISSING_DEPS+=("Python 3.8+")
else
    PYTHON_VERSION=$(python3 --version | awk '{print $2}')
    echo -e "${GREEN}✅ Python3: ${PYTHON_VERSION}${NC}"
fi

echo ""

# Exit if missing required dependencies
if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${RED}Missing required dependencies:${NC}"
    for dep in "${MISSING_DEPS[@]}"; do
        echo "  - $dep"
    done
    echo ""
    echo "Please install the missing dependencies and run this script again."
    exit 1
fi

# Confirm with user
echo "========================================================="
echo "This script will set up the Supply Chain Attack Testbench."
echo "It will create directories, install dependencies, and"
echo "configure the learning environment."
echo ""
echo -e "${YELLOW}⚠️  This environment contains intentionally vulnerable code${NC}"
echo -e "${YELLOW}   for educational purposes only.${NC}"
echo "========================================================="
echo ""

read -p "Do you want to continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 1
fi

# Enable testbench mode
echo ""
echo "🔧 Configuring environment..."
export TESTBENCH_MODE=enabled
if [ ! -f "${TESTBENCH_ENV_FILE}" ] || ! grep -q '^export TESTBENCH_MODE=enabled$' "${TESTBENCH_ENV_FILE}"; then
    cat > "${TESTBENCH_ENV_FILE}" << 'EOF'
export TESTBENCH_MODE=enabled
EOF
fi
echo -e "${GREEN}✅ TESTBENCH_MODE enabled for current shell${NC}"
echo -e "${GREEN}✅ Persistent env file: ${TESTBENCH_ENV_FILE}${NC}"
echo ""
echo "Add this once to your shell profile for future sessions:"
echo "  [ -f \"${TESTBENCH_ENV_FILE}\" ] && source \"${TESTBENCH_ENV_FILE}\""

# Make all setup scripts executable
echo ""
echo "🔐 Making setup scripts executable..."
find scenarios -name "setup.sh" -type f -exec chmod +x {} \;
echo -e "${GREEN}✅ Scripts configured${NC}"

# Create necessary directories
echo ""
echo "📁 Creating directory structure..."
mkdir -p logs
mkdir -p detection-tools
mkdir -p docs
echo -e "${GREEN}✅ Directories created${NC}"

# Setup complete
echo ""
echo "========================================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "========================================================="
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Start with Scenario 1 (Typosquatting):"
echo "   cd scenarios/01-typosquatting"
echo "   cat README.md"
echo "   ./setup.sh"
echo ""
echo "2. Read the documentation:"
echo "   cat documentation/SETUP.md"
echo ""
echo "4. Export testbench mode for this session:"
echo "   source .testbench.env"
echo ""
echo "5. Clean up after a lab run:"
echo "   ./scripts/teardown.sh"
echo ""
echo "Cleanup command to disable the mode in your current shell:"
echo "   unset TESTBENCH_MODE"
echo ""
echo "⚠️  IMPORTANT REMINDERS:"
echo "   - This is for EDUCATIONAL purposes only"
echo "   - Use ONLY in isolated environments"
echo "   - Never deploy malicious code to production"
echo "   - Always set TESTBENCH_MODE=enabled"
echo ""
echo "📖 Full documentation: cat README.md"
echo ""
echo "Happy learning! 🔐"

