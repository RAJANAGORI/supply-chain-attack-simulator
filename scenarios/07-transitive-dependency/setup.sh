#!/bin/bash

# Scenario 7: Transitive Dependency Attack - Setup Script
# This script prepares the environment for the transitive dependency attack lab

set -e  # Exit on error

echo "================================================"
echo "🔧 Setting up Transitive Dependency Attack Scenario"
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

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Create mock server
echo "📝 Creating mock attacker server..."
cat > infrastructure/mock-server.js << 'EOF'
/**
 * Mock Attacker Server
 * Receives and logs exfiltrated data from compromised transitive dependencies
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const logFile = path.join(__dirname, 'captured-data.json');

// Initialize log file
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/collect') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // Log to console
        console.log('\n🎯 CAPTURED DATA FROM TRANSITIVE DEPENDENCY:');
        console.log(`Package: ${data.package}@${data.version}`);
        console.log(`Hostname: ${data.hostname}`);
        console.log(`Username: ${data.username}`);
        console.log(`Platform: ${data.platform}`);
        console.log(JSON.stringify(data, null, 2));
        console.log('─'.repeat(50));
        
        // Save to file
        const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        captures.captures.push({
          timestamp: new Date().toISOString(),
          attackType: 'transitive-dependency',
          data: data
        });
        fs.writeFileSync(logFile, JSON.stringify(captures, null, 2));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Data received' }));
      } catch (e) {
        console.error('Error processing data:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/captured-data') {
    // Endpoint to view captured data
    const captures = fs.readFileSync(logFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(captures);
  } else if (req.method === 'DELETE' && req.url === '/captured-data') {
    // Endpoint to clear captured data
    fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Data cleared' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('🎭 Mock Attacker Server Started');
  console.log('─'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   /collect        - Receive exfiltrated data`);
  console.log(`  GET    /captured-data  - View captured data`);
  console.log(`  DELETE /captured-data  - Clear captured data`);
  console.log('─'.repeat(50));
  console.log('Waiting for data from transitive dependencies...\n');
});
EOF

chmod +x infrastructure/mock-server.js
echo "✅ Mock server created"
echo ""

# Initialize captured data file
echo "📝 Initializing captured data file..."
echo '{"captures": []}' > infrastructure/captured-data.json
echo "✅ Captured data file initialized"
echo ""

# Setup victim app
echo "📦 Setting up victim application..."
cd victim-app
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo "ℹ️  Dependencies already installed"
fi
cd ..
echo ""

# Make detection tools executable
echo "🔧 Setting up detection tools..."
chmod +x detection-tools/dependency-tree-scanner.js
echo "✅ Detection tools ready"
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
echo "2. Review the legitimate packages:"
echo "   cat legitimate-packages/web-utils/index.js"
echo "   cat legitimate-packages/data-processor/index.js"
echo ""
echo "3. Review the compromised package:"
echo "   cat compromised-packages/data-processor/postinstall.js"
echo ""
echo "4. Install the compromised transitive dependency:"
echo "   cd victim-app"
echo "   rm -rf node_modules package-lock.json"
echo "   npm install"
echo "   # Replace legitimate data-processor with compromised version"
echo "   # (In real attack, this would come from npm registry)"
echo "   cp -r ../compromised-packages/data-processor node_modules/data-processor"
echo "   # Reinstall to trigger postinstall script"
echo "   npm install"
echo ""
echo "5. Run the victim application:"
echo "   export TESTBENCH_MODE=enabled"
echo "   npm start"
echo ""
echo "6. Check captured data:"
echo "   curl http://localhost:3000/captured-data"
echo ""
echo "7. Run detection tools:"
echo "   node detection-tools/dependency-tree-scanner.js victim-app"
echo ""
echo "📖 Read the full lab instructions:"
echo "   cat README.md"
echo ""
echo "Happy learning! 🔐"

