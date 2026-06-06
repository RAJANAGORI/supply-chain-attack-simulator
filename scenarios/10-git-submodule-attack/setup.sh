#!/bin/bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori

# Scenario 10: Git Submodule Attack - Setup Script

set -e

echo "================================================"
echo "🔧 Setting up Git Submodule Attack Scenario"
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

command -v node >/dev/null 2>&1 || { echo "❌ Node.js is not installed"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ Git is not installed"; exit 1; }

echo "✅ Node.js version: $(node --version)"
echo "✅ Git version: $(git --version)"
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
        console.log('\n🎯 CAPTURED DATA FROM SUBMODULE ATTACK:');
        console.log(`Package: ${data.package}`);
        console.log(`Hostname: ${data.hostname}`);
        console.log(JSON.stringify(data, null, 2));
        console.log('─'.repeat(50));
        
        const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        captures.captures.push({ timestamp: new Date().toISOString(), attackType: 'git-submodule', data: data });
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
chmod +x malicious-submodule/postinstall.sh
echo '{"captures": []}' > infrastructure/captured-data.json
echo "✅ Mock server created"
echo ""

chmod +x detection-tools/submodule-validator.js
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
echo "2. Compare legitimate vs compromised repos:"
echo "   cat legitimate-repo/.gitmodules"
echo "   cat compromised-repo/.gitmodules"
echo ""
echo "3. Examine malicious submodule:"
echo "   cat malicious-submodule/postinstall.sh"
echo ""
echo "4. Simulate submodule execution:"
echo "   export TESTBENCH_MODE=enabled"
echo "   bash malicious-submodule/postinstall.sh"
echo ""
echo "5. Run detection tools:"
echo "   node detection-tools/submodule-validator.js compromised-repo"
echo ""
echo "📖 Read README.md for full instructions"

