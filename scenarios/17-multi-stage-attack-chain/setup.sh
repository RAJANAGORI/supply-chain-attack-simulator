#!/bin/bash
set -e

echo "================================================"
echo "🔧 Scenario 17: Multi-Stage Attack Chain"
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

cat <<'EOF'
================================================
🎯 Next Steps:
1) Install the stage packages into victim-app:
   cd victim-app
   rm -rf node_modules package-lock.json
   npm install ../packages/stage1-access-lib ../packages/stage2-compromised-lib

2) Run victim:
   npm start

3) Detection:
   node detection-tools/multi-stage-correlator.js .
================================================
EOF

