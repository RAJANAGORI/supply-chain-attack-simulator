#!/bin/bash

# Scenario 8: Package Lock File Manipulation - Setup Script
# This script prepares the environment for the lock file manipulation lab

set -e  # Exit on error

echo "================================================"
echo "🔧 Setting up Package Lock File Manipulation Scenario"
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

# Setup legitimate app
echo "📦 Setting up legitimate application..."
cd legitimate-app
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo "✅ Legitimate app dependencies installed"
else
    echo "ℹ️  Dependencies already installed"
fi
cd ..
echo ""

# Setup victim app (evil-utils file: dependency + lockfile)
echo "📦 Setting up victim application..."
cd victim-app

# Generate legitimate lock file first
if [ ! -f "package-lock.json" ]; then
    echo "Generating package-lock.json..."
    npm install
    echo "✅ Initial package-lock.json generated"
fi

chmod +x ../templates/manipulate-lock-file.js

# evil-utils is declared in package.json as file: (npm 7+ reconciles lockfile root with package.json;
# pure lock-only injection is pruned on npm install). Students can still run templates/manipulate-lock-file.js
# to practice tampering detection on a copy of the lockfile.
echo "Installing dependencies (includes evil-utils postinstall when TESTBENCH_MODE is enabled)..."
npm install
echo "✅ Dependencies installed"
cd ..
echo ""

# Setup compromised app (pre-compromised state)
echo "📦 Setting up compromised application (pre-manipulated)..."
cd compromised-app

# Generate legitimate lock file first
if [ ! -f "package-lock.json" ]; then
    echo "Generating package-lock.json..."
    npm install
    echo "✅ Initial package-lock.json generated"
fi

echo "✅ Compromised app package.json includes evil-utils (file:); run npm install here to populate node_modules"
cd ..
echo ""

# Setup mock server
echo "📝 Creating mock attacker server..."
cat > infrastructure/mock-server.js << 'EOF'
/**
 * Mock Attacker Server
 * Receives and logs exfiltrated data from lock file manipulation attacks
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
        console.log('\n🎯 CAPTURED DATA FROM LOCK FILE MANIPULATION:');
        console.log(`Package: ${data.package}@${data.version}`);
        console.log(`Attack Type: ${data.attackType}`);
        console.log(`Hostname: ${data.hostname}`);
        console.log(`Username: ${data.username}`);
        console.log(`Platform: ${data.platform}`);
        console.log(`Lock File Manipulated: ${data.lockFileManipulated}`);
        console.log(JSON.stringify(data, null, 2));
        console.log('─'.repeat(50));
        
        // Save to file
        const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        captures.captures.push({
          timestamp: new Date().toISOString(),
          attackType: 'package-lock-manipulation',
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
  console.log('Waiting for data from lock file manipulation attacks...\n');
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

# Make detection tools executable
echo "🔧 Setting up detection tools..."
chmod +x detection-tools/lock-file-validator.js
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
echo "2. Compare legitimate, victim, and compromised apps:"
echo "   # Legitimate app (clean lock file)"
echo "   cd legitimate-app"
echo "   cat package-lock.json | grep -A 5 '\"dependencies\"'"
echo ""
echo "   # Victim app (evil-utils file: dep + lockfile)"
echo "   cd ../victim-app"
echo "   cat package-lock.json | grep -A 5 'evil-utils'"
echo ""
echo "   # Compromised app (same model; run npm install when demoing)"
echo "   cd ../compromised-app"
echo "   cat package-lock.json | grep -A 5 'evil-utils'"
echo ""
echo "3. Run the victim application:"
echo "   export TESTBENCH_MODE=enabled"
echo "   npm start"
echo ""
echo "4. Check captured data:"
echo "   curl http://localhost:3000/captured-data"
echo ""
echo "5. Run detection tools:"
echo "   node detection-tools/lock-file-validator.js victim-app"
echo ""
echo "6. Compare package.json vs package-lock.json:"
echo "   cat package.json   # includes evil-utils file: — flag unexpected local deps"
echo "   cat package-lock.json | grep evil-utils"
echo ""
echo "7. Try the compromised app:"
echo "   cd compromised-app"
echo "   npm install  # links evil-utils from file:"
echo "   export TESTBENCH_MODE=enabled"
echo "   npm start"
echo ""
echo "📖 Read the full lab instructions:"
echo "   cat README.md"
echo ""
echo "Happy learning! 🔐"

