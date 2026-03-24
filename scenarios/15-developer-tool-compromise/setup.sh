#!/bin/bash
set -e

# Scenario 15: Developer Tool Compromise

echo "================================================"
echo "🔧 Scenario 15: Developer Tool Compromise"
echo "================================================"
echo ""

if [ "$TESTBENCH_MODE" != "enabled" ]; then
  echo "⚠️  WARNING: TESTBENCH_MODE is not enabled"
  echo "Run: export TESTBENCH_MODE=enabled"
  echo ""
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "📝 Preparing victim app steps..."
echo ""

cat <<'EOF'
================================================
🎯 Next Steps:
1) Start (this runner will start the mock server listener for you)

2) Install the malicious developer tool into the victim app:
   cd victim-app
   rm -rf node_modules package-lock.json
   npm install ../dev-tools/malicious-dev-tool

3) Run the victim app (dev-tool will have already exfiltrated on postinstall):
   npm start

4) Detection:
   node detection-tools/dev-tool-compromise-detector.js .
================================================
EOF

