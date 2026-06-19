#!/bin/bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCENARIO_DIR}"
# shellcheck disable=SC1091
source "${SCENARIO_DIR}/../_shared/enable-testbench.sh"

# Scenario 9: Package Signing Bypass - Setup Script

set -e

echo "================================================"
echo "🔧 Setting up Package Signing Bypass Scenario"
echo "================================================"
echo ""

echo "📋 Checking prerequisites..."
echo ""

command -v node >/dev/null 2>&1 || { echo "❌ Node.js is not installed"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is not installed"; exit 1; }

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

echo "📦 Setting up victim application..."
cd victim-app
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "ℹ️  Dependencies already installed"
fi
cd ..
echo ""

echo "📝 Creating mock server..."
cat > infrastructure/mock-server.js << 'EOF'
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
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('\n🎯 CAPTURED DATA FROM SIGNING BYPASS ATTACK:');
        console.log(`Package: ${data.package}@${data.version}`);
        console.log(`Signature Status: ${data.signatureStatus}`);
        console.log(`Key Compromised: ${data.keyCompromised}`);
        console.log(JSON.stringify(data, null, 2));
        console.log('─'.repeat(50));
        
        const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        captures.captures.push({ timestamp: new Date().toISOString(), attackType: 'package-signing-bypass', data: data });
        fs.writeFileSync(logFile, JSON.stringify(captures, null, 2));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (e) {
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/captured-data') {
    const captures = fs.readFileSync(logFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(captures);
  } else if (req.method === 'DELETE' && req.url === '/captured-data') {
    fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('🎭 Mock Attacker Server Started');
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('Waiting for data...\n');
});
EOF

chmod +x infrastructure/mock-server.js
echo '{"captures": []}' > infrastructure/captured-data.json
echo "✅ Mock server created"
echo ""

chmod +x detection-tools/signature-validator.js
echo "✅ Detection tools ready"
echo ""

echo "================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Start mock server:"
echo "   node infrastructure/mock-server.js &"
echo ""
echo "2. Compare legitimate vs compromised packages:"
echo "   cat legitimate-package/secure-utils/SIGNATURE.md"
echo "   cat compromised-package/secure-utils/SIGNATURE.md"
echo ""
echo "3. Install compromised package:"
echo "   cd victim-app"
echo "   npm install"
echo ""
echo "4. Run detection tools:"
echo "   node ../detection-tools/signature-validator.js node_modules/secure-utils"
echo ""
echo "5. Run victim app:"
echo "   export TESTBENCH_MODE=enabled"
echo "   npm start"
echo ""
echo "📖 Read README.md for full instructions"

