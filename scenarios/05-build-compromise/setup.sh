#!/bin/bash

# Scenario 5: Build System Compromise - Setup Script
# This script prepares the environment for the build compromise lab

set -e  # Exit on error

echo "================================================"
echo "🔧 Setting up Build System Compromise Scenario"
echo "================================================"
echo ""

# Check if TESTBENCH_MODE is enabled
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

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

command -v node >/dev/null 2>&1 || { echo "❌ Node.js is not installed. Please install Node.js 16+"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is not installed. Please install npm"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "❌ curl is not installed. Please install curl"; exit 1; }

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo "✅ curl version: $(curl --version | head -1)"
echo ""

# Create directories if they don't exist
echo "📁 Creating directory structure..."
mkdir -p legitimate-build
mkdir -p compromised-build
mkdir -p victim-app/dist
mkdir -p templates
mkdir -p detection-tools
mkdir -p infrastructure
echo "✅ Directories created"
echo ""

# Make build scripts executable
echo "🔐 Making build scripts executable..."
chmod +x legitimate-build/build.sh 2>/dev/null || true
chmod +x compromised-build/build.sh 2>/dev/null || true
chmod +x templates/build-compromise-template.sh 2>/dev/null || true
echo "✅ Scripts configured"
echo ""

# Create detection tool
echo "🔍 Creating detection tools..."
chmod +x detection-tools/secret-monitor.js
echo "✅ Detection tools created"
echo ""

echo "📝 Creating mock attacker server..."
cat > infrastructure/mock-server.js << 'EOF'
/**
 * Mock Attacker Server — Scenario 5: Build Compromise
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const logFile = path.join(__dirname, 'captured-data.json');

if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/collect') {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('\n🎯 CAPTURED DATA (build-compromise):');
        console.log(JSON.stringify(data, null, 2));
        console.log('─'.repeat(50));
        const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        captures.captures.push({ timestamp: new Date().toISOString(), data });
        fs.writeFileSync(logFile, JSON.stringify(captures, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Data received' }));
      } catch (e) {
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/captured-data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(fs.readFileSync(logFile, 'utf8'));
  } else if (req.method === 'DELETE' && req.url === '/captured-data') {
    fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Data cleared' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('🎭 Mock Attacker Server (Scenario 5) — http://localhost:' + PORT);
});
EOF
chmod +x infrastructure/mock-server.js
echo "✅ Mock server created"
echo ""

echo "================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Start the mock attacker server:"
echo "   node infrastructure/mock-server.js &"
echo ""
echo "2. Review the legitimate build:"
echo "   cat legitimate-build/build.sh"
echo ""
echo "3. Review the compromised build:"
echo "   cat compromised-build/build.sh"
echo ""
echo "4. Run the legitimate build:"
echo "   cd legitimate-build"
echo "   npm run build"
echo ""
echo "5. Run the compromised build:"
echo "   cd compromised-build"
echo "   export TESTBENCH_MODE=enabled"
echo "   export AWS_ACCESS_KEY_ID=test-key-12345"
echo "   export AWS_SECRET_ACCESS_KEY=test-secret-67890"
echo "   export DATABASE_PASSWORD=super-secret-password"
echo "   npm run build"
echo ""
echo "6. Check captured data:"
echo "   curl http://localhost:3000/captured-data"
echo ""
echo "7. Use compromised build artifacts:"
echo "   cp compromised-build/dist/* victim-app/dist/"
echo "   cd victim-app"
echo "   export TESTBENCH_MODE=enabled"
echo "   npm start"
echo ""
echo "8. Run detection scanner:"
echo "   node detection-tools/secret-monitor.js compromised-build"
echo ""
echo "📖 Read the full lab instructions:"
echo "   cat README.md"
echo ""
echo "Happy hacking! 🔐"

