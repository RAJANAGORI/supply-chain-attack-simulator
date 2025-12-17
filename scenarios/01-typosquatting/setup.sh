#!/bin/bash

# Scenario 1: Typosquatting Attack - Setup Script
# This script prepares the environment for the typosquatting lab

set -e  # Exit on error

echo "================================================"
echo "🔧 Setting up Typosquatting Attack Scenario"
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

# Create directories if they don't exist
echo "📁 Creating directory structure..."
mkdir -p malicious-packages/request-lib
mkdir -p infrastructure
echo "✅ Directories created"
echo ""

# Copy malicious package template
echo "📦 Setting up malicious package template..."
if [ ! -f "malicious-packages/request-lib/index.js" ]; then
    cp templates/malicious-package-template.js malicious-packages/request-lib/index.js
    cat > malicious-packages/request-lib/package.json << 'EOF'
{
  "name": "request-lib",
  "version": "1.0.0",
  "description": "A simple HTTP request library [MALICIOUS - EDUCATIONAL ONLY]",
  "main": "index.js",
  "keywords": ["http", "request", "fetch", "api"],
  "author": "Attacker (Educational Demo)",
  "license": "MIT"
}
EOF
    echo "✅ Malicious package template created"
else
    echo "ℹ️  Malicious package already exists"
fi
echo ""

# Install victim app dependencies
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

# Check if Docker is available
if command -v docker >/dev/null 2>&1; then
    echo "🐳 Docker detected"
    echo "You can start the mock attacker server with:"
    echo "   cd infrastructure && docker-compose up -d"
else
    echo "⚠️  Docker not found. You'll need to run the mock server manually."
fi
echo ""

# Create a simple mock server if Docker is not used
echo "📝 Creating standalone mock server..."
cat > infrastructure/mock-server.js << 'EOF'
/**
 * Mock Attacker Server
 * Receives and logs exfiltrated data from malicious packages
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
                console.log('\n🎯 CAPTURED DATA:');
                console.log(JSON.stringify(data, null, 2));
                console.log('─'.repeat(50));
                
                // Save to file
                const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
                captures.captures.push({
                    timestamp: new Date().toISOString(),
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
    console.log('Waiting for data...\n');
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
echo "2. Review the legitimate package:"
echo "   cat legitimate/requests-lib/index.js"
echo ""
echo "3. Review the malicious package template:"
echo "   cat templates/malicious-package-template.js"
echo ""
echo "4. Install the typosquatted package (simulate typo):"
echo "   cd victim-app"
echo "   npm install ../malicious-packages/request-lib"
echo ""
echo "5. Run the victim application:"
echo "   export TESTBENCH_MODE=enabled"
echo "   npm start"
echo ""
echo "6. Check captured data:"
echo "   curl http://localhost:3000/captured-data"
echo ""
echo "📖 Read the full lab instructions:"
echo "   cat README.md"
echo ""
echo "Happy hacking! 🔐"

