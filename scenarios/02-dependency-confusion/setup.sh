#!/bin/bash

# Scenario 2: Dependency Confusion Attack - Setup Script

set -e

echo "================================================"
echo "🔧 Setting up Dependency Confusion Scenario"
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
mkdir -p attacker-packages/@techcorp/auth-lib
mkdir -p attacker-packages/@techcorp/data-utils
mkdir -p attacker-packages/@techcorp/api-client
mkdir -p infrastructure
mkdir -p leaked-data
mkdir -p corporate-app/scripts
mkdir -p detection-tools
echo "✅ Directories created"
echo ""

# Seed malicious package metadata so flow doesn't break after copying index.js
cat > attacker-packages/@techcorp/auth-lib/package.json << 'EOF'
{
  "name": "@techcorp/auth-lib",
  "version": "999.999.999",
  "description": "TechCorp Authentication Library [MALICIOUS - EDUCATIONAL]",
  "main": "index.js"
}
EOF

# Create leaked package.json (simulates reconnaissance)
echo "📄 Creating leaked data (reconnaissance simulation)..."
cat > leaked-data/package.json << 'EOF'
{
  "name": "techcorp-web-app",
  "dependencies": {
    "@techcorp/auth-lib": "^1.0.0",
    "@techcorp/data-utils": "^1.0.0",
    "@techcorp/api-client": "^1.0.0"
  }
}
EOF
echo "✅ Leaked data created"
echo ""

# Create remaining internal packages
echo "📦 Creating internal packages..."

mkdir -p internal-packages/@techcorp/data-utils
cat > internal-packages/@techcorp/data-utils/package.json << 'EOF'
{
  "name": "@techcorp/data-utils",
  "version": "1.0.5",
  "description": "TechCorp Data Utilities [LEGITIMATE INTERNAL]",
  "main": "index.js",
  "private": true
}
EOF

cat > internal-packages/@techcorp/data-utils/index.js << 'EOF'
class DataUtils {
  static createService(config) {
    console.log('  [data-utils] Initializing with internal version 1.0.5');
    return { dbConnection: config.dbConnection };
  }
}
module.exports = DataUtils;
EOF

mkdir -p internal-packages/@techcorp/api-client
cat > internal-packages/@techcorp/api-client/package.json << 'EOF'
{
  "name": "@techcorp/api-client",
  "version": "2.1.0",
  "description": "TechCorp API Client [LEGITIMATE INTERNAL]",
  "main": "index.js",
  "private": true
}
EOF

cat > internal-packages/@techcorp/api-client/index.js << 'EOF'
class ApiClient {
  static create(config) {
    console.log('  [api-client] Initializing with internal version 2.1.0');
    return { baseUrl: config.baseUrl };
  }
}
module.exports = ApiClient;
EOF

echo "✅ Internal packages created"
echo ""

# Create validation script
echo "🔒 Creating dependency validation script..."
cat > corporate-app/scripts/validate-dependencies.js << 'EOF'
#!/usr/bin/env node

/**
 * Pre-install validation script
 * Checks for dependency confusion attacks
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating dependencies for security...\n');

try {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
  );

  const internalPackages = Object.keys(packageJson.dependencies || {})
    .filter(name => name.startsWith('@techcorp/'));

  console.log(`Found ${internalPackages.length} internal packages:`);
  internalPackages.forEach(pkg => console.log(`  - ${pkg}`));
  console.log('');

  // In a real implementation, this would:
  // 1. Check registry source for each package
  // 2. Verify versions aren't suspiciously high
  // 3. Validate integrity hashes
  // 4. Ensure packages come from internal registry

  console.log('✅ Validation complete (basic check only)\n');
  process.exit(0);

} catch (error) {
  console.error('❌ Validation failed:', error.message);
  process.exit(0); // Don't block install in this demo
}
EOF

chmod +x corporate-app/scripts/validate-dependencies.js
echo "✅ Validation script created"
echo ""

# Create detection tools
echo "🔍 Creating detection tools..."
cat > detection-tools/dependency-confusion-scanner.js << 'EOF'
#!/usr/bin/env node

/**
 * Dependency Confusion Scanner
 * Detects potential dependency confusion attacks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function scanProject(projectPath) {
  console.log('🔍 Scanning for Dependency Confusion vulnerabilities...\n');
  
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageLockPath = path.join(projectPath, 'package-lock.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  // Check for scoped packages (potential private packages)
  const scopedPackages = Object.keys(allDeps).filter(name => name.startsWith('@'));
  
  console.log(`Found ${scopedPackages.length} scoped packages:\n`);
  
  let suspicious = [];
  
  scopedPackages.forEach(pkgName => {
    console.log(`Checking ${pkgName}...`);
    
    // Check if package is installed
    const nodeModulesPath = path.join(projectPath, 'node_modules', pkgName, 'package.json');
    
    if (fs.existsSync(nodeModulesPath)) {
      const installedPkg = JSON.parse(fs.readFileSync(nodeModulesPath, 'utf8'));
      
      // Check for suspicious version numbers
      const version = installedPkg.version;
      const [major] = version.split('.');
      
      if (parseInt(major) > 100) {
        console.log(`  ⚠️  SUSPICIOUS: Version ${version} is unusually high!`);
        suspicious.push({ package: pkgName, version, reason: 'High version number' });
      } else {
        console.log(`  ✅ Version ${version} looks normal`);
      }
    }
  });
  
  console.log('\n' + '='.repeat(60));
  if (suspicious.length > 0) {
    console.log('⚠️  POTENTIAL DEPENDENCY CONFUSION DETECTED\n');
    suspicious.forEach(item => {
      console.log(`Package: ${item.package}`);
      console.log(`Version: ${item.version}`);
      console.log(`Reason: ${item.reason}\n`);
    });
    process.exit(1);
  } else {
    console.log('✅ No obvious dependency confusion detected');
  }
  console.log('='.repeat(60));
}

const projectPath = process.argv[2] || process.cwd();
scanProject(projectPath);
EOF

chmod +x detection-tools/dependency-confusion-scanner.js
echo "✅ Detection tools created"
echo ""

# Mock server (self-contained; do not rely on other scenarios)
echo "📝 Creating mock attacker server..."
cat > infrastructure/mock-server.js << 'EOF'
/**
 * Mock Attacker Server — Scenario 2: Dependency Confusion
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
        console.log('\n🎯 CAPTURED DATA (dependency-confusion):');
        console.log(JSON.stringify(data, null, 2));
        console.log('─'.repeat(50));
        const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        captures.captures.push({ timestamp: new Date().toISOString(), data });
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
  console.log('🎭 Mock Attacker Server (Scenario 2) — http://localhost:' + PORT);
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
echo "2. Examine leaked data (reconnaissance):"
echo "   cat leaked-data/package.json"
echo ""
echo "3. Review internal packages:"
echo "   ls -la internal-packages/@techcorp/"
echo ""
echo "4. Create malicious package using template:"
echo "   cp templates/dependency-confusion-template.js attacker-packages/@techcorp/auth-lib/index.js"
echo ""
echo "5. Confirm malicious package metadata:"
echo "   cd attacker-packages/@techcorp/auth-lib"
echo "   cat package.json"
echo ""
echo "6. Install in corporate app (link for testing):"
echo "   cd ../../../corporate-app"
echo "   npm install"
echo "   # then simulate confusion by installing the attacker package:"
echo "   npm install ../attacker-packages/@techcorp/auth-lib"
echo ""
echo "7. Run victim application:"
echo "   export TESTBENCH_MODE=enabled"
echo "   npm start"
echo ""
echo "8. Check for exfiltrated data:"
echo "   curl http://localhost:3000/captured-data"
echo ""
echo "9. Run detection scanner:"
echo "   node ../detection-tools/dependency-confusion-scanner.js ."
echo ""
echo "📖 Read full instructions: cat README.md"
echo ""

