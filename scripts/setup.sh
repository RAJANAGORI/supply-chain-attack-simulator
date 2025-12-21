#!/bin/bash

# Main Setup Script for Supply Chain Attack Testbench
# This script prepares the entire environment

set -e

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

# # Check Docker (optional)
# if ! command -v docker &> /dev/null; then
#     echo -e "${YELLOW}⚠️  Docker not found (optional)${NC}"
# else
#     DOCKER_VERSION=$(docker --version)
#     echo -e "${GREEN}✅ Docker: ${DOCKER_VERSION}${NC}"
# fi

# # Check Docker Compose (optional)
# if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
#     echo -e "${YELLOW}⚠️  Docker Compose not found (optional)${NC}"
# else
#     echo -e "${GREEN}✅ Docker Compose available${NC}"
# fi

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
echo "export TESTBENCH_MODE=enabled" >> ~/.bashrc 2>/dev/null || true
echo "export TESTBENCH_MODE=enabled" >> ~/.zshrc 2>/dev/null || true
echo -e "${GREEN}✅ TESTBENCH_MODE enabled${NC}"

# Make all setup scripts executable
echo ""
echo "🔐 Making setup scripts executable..."
find scenarios -name "setup.sh" -type f -exec chmod +x {} \;
echo -e "${GREEN}✅ Scripts configured${NC}"

# Create necessary directories
echo ""
echo "📁 Creating directory structure..."
mkdir -p logs
# mkdir -p docker/dashboard/public
mkdir -p detection-tools
mkdir -p docs
echo -e "${GREEN}✅ Directories created${NC}"

# # Install dashboard dependencies (if Docker not used)
# if [ ! -f "docker/dashboard/node_modules/.installed" ]; then
#     echo ""
#     echo "📦 Installing dashboard dependencies..."
#     cd docker/dashboard
#     npm install --silent
#     touch node_modules/.installed
#     cd ../..
#     echo -e "${GREEN}✅ Dashboard dependencies installed${NC}"
# fi

# # Start Docker services if available
# if command -v docker &> /dev/null; then
#     echo ""
#     echo "🐳 Starting Docker services..."
#     cd docker
    
#     if docker compose version &> /dev/null; then
#         docker compose up -d
#     elif command -v docker-compose &> /dev/null; then
#         docker-compose up -d
#     fi
    
#     if [ $? -eq 0 ]; then
#         echo -e "${GREEN}✅ Docker services started${NC}"
#         echo ""
#         echo "Services available at:"
#         echo "  - Mock Server: http://localhost:3000"
#         echo "  - Dashboard: http://localhost:8080"
#         echo "  - Private Registry: http://localhost:4873"
#         echo "  - Public Registry: http://localhost:4874"
#     else
#         echo -e "${YELLOW}⚠️  Docker services failed to start${NC}"
#         echo "You can start them manually later with: cd docker && docker-compose up -d"
#     fi
    
#     cd ..
# else
#     echo ""
#     echo -e "${YELLOW}⚠️  Docker not available, skipping service startup${NC}"
#     echo "You can run the mock server manually with:"
#     echo "  node scenarios/01-typosquatting/infrastructure/mock-server.js"
# fi

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
# echo "2. Open the dashboard:"
# echo "   http://localhost:8080"
# echo ""
echo "2. Read the documentation:"
echo "   cat docs/SETUP.md"
echo ""
echo "4. Export testbench mode for this session:"
echo "   export TESTBENCH_MODE=enabled"
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

