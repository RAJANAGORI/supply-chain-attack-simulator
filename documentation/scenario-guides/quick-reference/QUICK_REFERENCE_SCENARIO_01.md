# 🚀 Quick Reference Card

Use this as your runbook for Scenario 1 when you are teaching live or practicing quickly.

## 📋 Initial Setup (One-Time)

```bash
# 1. Enable testbench mode
export TESTBENCH_MODE=enabled
echo 'export TESTBENCH_MODE=enabled' >> ~/.zshrc
source ~/.zshrc

# 2. Run main setup
chmod +x scripts/setup.sh
./scripts/setup.sh
```

## 🎯 Scenario 1: Quick Start

```bash
# 1. Navigate to scenario
cd scenarios/01-typosquatting

# 2. Run scenario setup
./setup.sh

# 3. Start mock server (in a separate terminal)
node infrastructure/mock-server.js &

# 4. Install malicious package (simulate typo)
cd victim-app
npm install ../malicious-packages/request-lib

# 5. Run victim app
export TESTBENCH_MODE=enabled
npm start

# 6. Check captured data
curl http://localhost:3000/captured-data
```

## 🔍 Detection Commands

```bash
# Manual code review
cat node_modules/request-lib/index.js

# Check package metadata
cat node_modules/request-lib/package.json

# Run automated scanner (from repository root)
node detection-tools/package-scanner.js scenarios/01-typosquatting/victim-app

# Network monitoring (from repository root)
./detection-tools/network-monitor.sh
```

## 🛠️ Useful Commands

```bash
# Check if services are running
curl http://localhost:3000/captured-data

# Clear captured data
curl -X DELETE http://localhost:3000/captured-data

# Check TESTBENCH_MODE
echo $TESTBENCH_MODE

# Find process using port
lsof -i :3000
```

## 📁 Important File Locations

```text
scenarios/01-typosquatting/
├── legitimate/requests-lib/          # Legitimate package
├── malicious-packages/request-lib/   # Malicious package
├── victim-app/                        # Victim application
├── infrastructure/mock-server.js     # Mock attacker server
└── templates/                         # Package templates
```

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| TESTBENCH_MODE not set | `export TESTBENCH_MODE=enabled` |
| Port 3000 in use | `lsof -i :3000` then `kill -9 <PID>` |
| Mock server not running | `node infrastructure/mock-server.js &` |
| Cannot find module | `cd victim-app && npm install` |

## 📚 Documentation Links

If you need more context than the commands above, these are the right deep links.

- Full Guide: `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_01.md`
- Setup Guide: `documentation/SETUP.md`
- Quick Start: `documentation/QUICK_START.md`
- Best Practices: `documentation/BEST_PRACTICES.md`

