#!/bin/bash
set -e

echo "================================================"
echo "🔧 Scenario 20: Package Version Confusion"
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
1) Run victim version-confusion simulation:
   cd victim-app
   npm start

2) Detection:
   node detection-tools/version-confusion-detector.js .
================================================
EOF

