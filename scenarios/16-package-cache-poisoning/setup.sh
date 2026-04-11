#!/bin/bash
set -e

echo "================================================"
echo "🔧 Scenario 16: Package Cache Poisoning"
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

echo "📝 Preparing poisoned cache steps..."
echo ""

cat <<'EOF'
================================================
🎯 Next Steps:
1) Prepare poisoned cache behavior (already part of this scenario setup)

2) Install victim app dependencies to trigger poisoned-cache install-from-cache:
   cd victim-app
   rm -rf node_modules package-lock.json
   npm install

3) Reinstall again to demonstrate persistence across reinstalls:
   rm -rf node_modules package-lock.json
   npm install

4) Run victim app:
   npm start

5) Detection:
   node detection-tools/cache-poisoning-detector.js .
================================================
EOF

