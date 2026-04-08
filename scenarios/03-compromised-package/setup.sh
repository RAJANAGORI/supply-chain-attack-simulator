#!/bin/bash

# Scenario 3: Compromised Package — Setup Script

set -e

echo "================================================"
echo "🔧 Setting up Compromised Package Attack Scenario"
echo "================================================"
echo ""

if [ "$TESTBENCH_MODE" != "enabled" ]; then
    echo "⚠️  WARNING: TESTBENCH_MODE is not enabled"
    echo "Please run: export TESTBENCH_MODE=enabled"
    echo ""
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📋 Checking prerequisites..."
echo ""

command -v node >/dev/null 2>&1 || { echo "❌ Node.js is not installed. Please install Node.js 16+"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is not installed. Please install npm"; exit 1; }

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 Ensuring directory structure..."
mkdir -p compromised-package/secure-validator
mkdir -p infrastructure
mkdir -p detection-tools
mkdir -p forensics
mkdir -p victim-app/logs
echo "✅ Directories ready"
echo ""

echo "📦 Syncing compromised package from template..."
cp templates/compromised-package-template.js compromised-package/secure-validator/index.js
echo "✅ compromised-package/secure-validator/index.js updated from template"
echo ""

echo "📦 Installing victim application (starts on legitimate secure-validator@2.5.3)..."
cd victim-app
rm -rf node_modules package-lock.json
npm install
cd ..
echo ""

chmod +x detection-tools/*.js detection-tools/*.sh 2>/dev/null || true
chmod +x forensics/*.js 2>/dev/null || true
echo "✅ Detection / forensics scripts marked executable"

echo "================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Start the mock attacker server (separate terminal):"
echo "   node infrastructure/mock-server.js"
echo ""
echo "2. Review the legitimate package (v2.5.3):"
echo "   cat legitimate-package/secure-validator/index.js"
echo ""
echo "3. Review the compromised package (v2.5.4):"
echo "   cat compromised-package/secure-validator/index.js"
echo ""
echo "4. Run the victim app with the legitimate install (already done):"
echo "   cd victim-app && export TESTBENCH_MODE=enabled && npm start"
echo ""
echo "5. Simulate installing the compromised patch version:"
echo "   cd victim-app"
echo "   npm install ../compromised-package/secure-validator"
echo "   export TESTBENCH_MODE=enabled && npm start"
echo ""
echo "6. Inspect exfiltration:"
echo "   curl http://localhost:3000/captured-data"
echo ""
echo "7. Optional: compare versions"
echo "   node forensics/compare-versions.js legitimate-package/secure-validator compromised-package/secure-validator"
echo ""
echo "📖 Full lab: cat README.md"
echo ""
