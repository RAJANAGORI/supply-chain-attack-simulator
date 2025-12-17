#!/bin/bash

# Interactive Starter Script for New Users
# This script guides you through the setup process step by step

set -e

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

# Check Docker (optional)
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker: $(docker --version)${NC}"
    DOCKER_AVAILABLE=1
else
    echo -e "${YELLOW}⚠️  Docker not found (optional, but recommended)${NC}"
    DOCKER_AVAILABLE=0
fi

echo ""

if [ $MISSING -eq 1 ]; then
    echo -e "${RED}Please install missing prerequisites and run this script again.${NC}"
    exit 1
fi

# Step 2: Enable TESTBENCH_MODE
echo -e "${BLUE}Step 2: Setting up TESTBENCH_MODE...${NC}"
if [ "$TESTBENCH_MODE" != "enabled" ]; then
    export TESTBENCH_MODE=enabled
    echo -e "${GREEN}✅ TESTBENCH_MODE enabled for this session${NC}"
    
    # Add to shell config
    if [ -f ~/.zshrc ]; then
        if ! grep -q "TESTBENCH_MODE" ~/.zshrc; then
            echo 'export TESTBENCH_MODE=enabled' >> ~/.zshrc
            echo -e "${GREEN}✅ Added to ~/.zshrc for future sessions${NC}"
        fi
    elif [ -f ~/.bashrc ]; then
        if ! grep -q "TESTBENCH_MODE" ~/.bashrc; then
            echo 'export TESTBENCH_MODE=enabled' >> ~/.bashrc
            echo -e "${GREEN}✅ Added to ~/.bashrc for future sessions${NC}"
        fi
    fi
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

# Step 4: Start Docker services (if available)
if [ $DOCKER_AVAILABLE -eq 1 ]; then
    echo -e "${BLUE}Step 4: Starting Docker services...${NC}"
    echo ""
    read -p "Start Docker services? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd docker
        if docker compose version &> /dev/null; then
            docker compose up -d
        elif command -v docker-compose &> /dev/null; then
            docker-compose up -d
        fi
        cd ..
        echo -e "${GREEN}✅ Docker services started${NC}"
        echo ""
        echo "Services available at:"
        echo "  - Mock Server: http://localhost:3000"
        echo "  - Dashboard: http://localhost:8080"
    fi
else
    echo -e "${YELLOW}Step 4: Skipping Docker (not available)${NC}"
    echo "You can start the mock server manually later."
fi

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
echo "   ${CYAN}cat docs/ZERO_TO_HERO.md${NC}"
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
echo "   Or open: ${CYAN}http://localhost:8080${NC}"
echo ""
echo -e "${YELLOW}📚 Documentation:${NC}"
echo "   - Zero to Hero Guide: ${CYAN}docs/ZERO_TO_HERO.md${NC}"
echo "   - Quick Reference: ${CYAN}docs/QUICK_REFERENCE.md${NC}"
echo "   - Setup Guide: ${CYAN}docs/SETUP.md${NC}"
echo ""
echo -e "${RED}⚠️  REMEMBER: This is for EDUCATIONAL purposes only!${NC}"
echo ""
echo -e "${GREEN}Happy learning! 🔐${NC}"

