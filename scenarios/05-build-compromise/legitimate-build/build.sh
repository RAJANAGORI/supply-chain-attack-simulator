#!/bin/bash

# LEGITIMATE BUILD SCRIPT
# This is a clean, secure build script

set -e  # Exit on error

echo "=========================================="
echo "🔨 Starting Build Process"
echo "=========================================="
echo ""

# Create build directory
echo "📁 Creating build directory..."
mkdir -p dist
echo "✅ Build directory created"
echo ""

# Compile source files
echo "📦 Compiling source files..."
cat > dist/app.js << 'EOF'
/**
 * LEGITIMATE APPLICATION
 * Compiled from source
 */

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
  "buildSystem": "legitimate",
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

