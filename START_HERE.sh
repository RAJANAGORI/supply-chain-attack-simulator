#!/bin/bash

# Interactive Starter Script for New Users
# This script guides you through the setup process step by step

set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTBENCH_ENV_FILE="${ROOT_DIR}/.testbench.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}========================================================${NC}"
echo -e "${CYAN}   🔐 Supply Chain Attack Testbench${NC}"
echo -e "${CYAN}   Welcome! Let's get you started step by step${NC}"
echo -e "${CYAN}========================================================${NC}"
echo ""

# Step 1: Check Prerequisites
echo -e "${BLUE}Step 1: Checking Prerequisites...${NC}"
echo ""

MISSING=0

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js: ${NODE_VERSION}${NC}"
else
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "   Please install Node.js from https://nodejs.org"
    MISSING=1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm: ${NPM_VERSION}${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
    MISSING=1
fi

# Check Python 3
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | awk '{print $2}')
    echo -e "${GREEN}✅ Python3: ${PYTHON_VERSION}${NC}"
else
    echo -e "${RED}❌ Python 3 not found${NC}"
    echo "   Please install Python 3.8+"
    MISSING=1
fi

echo ""

if [ $MISSING -eq 1 ]; then
    echo -e "${RED}Please install missing prerequisites and run this script again.${NC}"
    exit 1
fi

# Step 2: Enable TESTBENCH_MODE
echo -e "${BLUE}Step 2: Setting up TESTBENCH_MODE...${NC}"
if [ "${TESTBENCH_MODE:-}" != "enabled" ]; then
    export TESTBENCH_MODE=enabled
    echo -e "${GREEN}✅ TESTBENCH_MODE enabled for this session${NC}"
    if [ ! -f "${TESTBENCH_ENV_FILE}" ] || ! grep -q '^export TESTBENCH_MODE=enabled$' "${TESTBENCH_ENV_FILE}"; then
        cat > "${TESTBENCH_ENV_FILE}" << 'EOF'
export TESTBENCH_MODE=enabled
EOF
    fi
    echo -e "${GREEN}✅ Saved persistent env file: ${TESTBENCH_ENV_FILE}${NC}"
    echo "   Add this once to your shell profile:"
    echo "   [ -f \"${TESTBENCH_ENV_FILE}\" ] && source \"${TESTBENCH_ENV_FILE}\""
else
    echo -e "${GREEN}✅ TESTBENCH_MODE already enabled${NC}"
fi
echo ""

# Step 3: Run main setup
echo -e "${BLUE}Step 3: Running main setup script...${NC}"
echo ""
read -p "This will set up the entire environment. Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

chmod +x scripts/setup.sh
./scripts/setup.sh

echo ""

# Step 5: Setup Scenario 1
echo -e "${BLUE}Step 5: Setting up Scenario 1 (Typosquatting)...${NC}"
echo ""
read -p "Set up the first scenario now? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd scenarios/01-typosquatting
    chmod +x setup.sh
    ./setup.sh
    cd ../..
    echo -e "${GREEN}✅ Scenario 1 setup complete${NC}"
fi

echo ""

# Final instructions
echo -e "${CYAN}========================================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${CYAN}========================================================${NC}"
echo ""
echo -e "${YELLOW}📖 Next Steps:${NC}"
echo ""
echo "1. Read the complete guide:"
echo "   ${CYAN}cat documentation/ZERO_TO_HERO.md${NC}"
echo "   (same content: ${CYAN}docs/ZERO_TO_HERO.md${NC} → documentation, for GitHub Pages)"
echo ""
echo "2. Or follow the quick start:"
echo "   ${CYAN}cd scenarios/01-typosquatting${NC}"
echo "   ${CYAN}./setup.sh${NC}"
echo "   ${CYAN}cd victim-app${NC}"
echo "   ${CYAN}npm install ../malicious-packages/request-lib${NC}"
echo "   ${CYAN}npm start${NC}"
echo ""
echo "3. View captured data:"
echo "   ${CYAN}curl http://localhost:3000/captured-data${NC}"
echo ""
echo -e "${YELLOW}📚 Documentation:${NC}"
echo "   - Zero to Hero Guide: ${CYAN}documentation/ZERO_TO_HERO.md${NC}"
echo "   - Quick Reference: ${CYAN}documentation/QUICK_REFERENCE.md${NC}"
echo "   - Setup Guide: ${CYAN}documentation/SETUP.md${NC}"
echo "   - Teardown script: ${CYAN}./scripts/teardown.sh${NC}"
echo ""
echo "Cleanup command for current shell:"
echo "   ${CYAN}unset TESTBENCH_MODE${NC}"
echo ""
echo -e "${RED}⚠️  REMEMBER: This is for EDUCATIONAL purposes only!${NC}"
echo ""
echo -e "${GREEN}Happy learning! 🔐${NC}"

