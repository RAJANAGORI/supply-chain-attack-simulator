#!/bin/bash

# Scenario 4: Malicious Update Attack - Setup Script
# This script prepares the environment for the malicious update lab

set -e  # Exit on error

echo "================================================"
echo "🔧 Setting up Malicious Update Attack Scenario"
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
mkdir -p legitimate-package/utils-helper
mkdir -p malicious-update/utils-helper
mkdir -p victim-app
mkdir -p templates
mkdir -p detection-tools
mkdir -p infrastructure
echo "✅ Directories created"
echo ""

# Create legitimate package (if not exists)
echo "📦 Setting up legitimate package..."
if [ ! -f "legitimate-package/utils-helper/package.json" ]; then
    echo "✅ Legitimate package already exists"
else
    echo "✅ Legitimate package structure ready"
fi
echo ""

# Create malicious update package (if not exists)
echo "📦 Setting up malicious update package..."
if [ ! -f "malicious-update/utils-helper/package.json" ]; then
    echo "✅ Malicious update package already exists"
else
    echo "✅ Malicious update package structure ready"
fi
echo ""

# Install victim app dependencies
echo "📦 Setting up victim application..."
cd victim-app
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --silent 2>/dev/null || true
else
    echo "ℹ️  Dependencies already installed"
fi
cd ..
echo ""

echo "📝 Creating mock attacker server..."
cat > infrastructure/mock-server.js << 'EOF'
/**
 * Mock Attacker Server — Scenario 4: Malicious Update
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
        console.log('\n🎯 CAPTURED DATA (malicious-update):');
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
  console.log('🎭 Mock Attacker Server (Scenario 4) — http://localhost:' + PORT);
});
EOF
chmod +x infrastructure/mock-server.js
echo "✅ Mock server created"
echo ""

# Create detection tool
echo "🔍 Creating detection tools..."
cat > detection-tools/update-scanner.js << 'EOF'
#!/usr/bin/env node

/**
 * Update Scanner
 * Detects potential malicious updates
 */

const fs = require('fs');
const path = require('path');

function scanProject(projectPath) {
  console.log('🔍 Scanning for malicious updates...\n');
  
  const packageJsonPath = path.join(projectPath, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  console.log('Checking dependencies for version ranges:\n');
  
  let suspicious = [];
  
  Object.keys(allDeps).forEach(pkgName => {
    const version = allDeps[pkgName];
    
    // Check for version ranges that allow automatic updates
    if (version.startsWith('^') || version.startsWith('~') || version === '*' || version === 'latest') {
      console.log(`⚠️  ${pkgName}: ${version} (allows automatic updates)`);
      suspicious.push({ package: pkgName, version, reason: 'Version range allows automatic updates' });
    } else {
      console.log(`✅ ${pkgName}: ${version} (pinned version)`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  if (suspicious.length > 0) {
    console.log('⚠️  DEPENDENCIES WITH AUTOMATIC UPDATES DETECTED\n');
    suspicious.forEach(item => {
      console.log(`Package: ${item.package}`);
      console.log(`Version: ${item.version}`);
      console.log(`Reason: ${item.reason}\n`);
    });
    console.log('Recommendation: Pin exact versions in production');
  } else {
    console.log('✅ All dependencies use pinned versions');
  }
  console.log('='.repeat(60));
}

const projectPath = process.argv[2] || process.cwd();
scanProject(projectPath);
EOF

chmod +x detection-tools/update-scanner.js
echo "✅ Detection tools created"
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
echo "   cat legitimate-package/utils-helper/index.js"
echo ""
echo "3. Review the malicious update:"
echo "   cat malicious-update/utils-helper/index.js"
echo ""
echo "4. Install legitimate version:"
echo "   cd victim-app"
echo "   npm install ../legitimate-package/utils-helper"
echo ""
echo "5. Simulate automatic update:"
echo "   rm -rf node_modules package-lock.json"
echo "   npm install"
echo "   # Or: npm update utils-helper"
echo ""
echo "6. Run the victim application:"
echo "   export TESTBENCH_MODE=enabled"
echo "   npm start"
echo ""
echo "7. Check captured data:"
echo "   curl http://localhost:3000/captured-data"
echo ""
echo "8. Run detection scanner (from victim-app):"
echo "   node ../detection-tools/update-scanner.js ."
echo ""
echo "📖 Read the full lab instructions:"
echo "   cat README.md"
echo ""
echo "Happy hacking! 🔐"

