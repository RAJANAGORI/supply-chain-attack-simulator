# 🚀 Quick Reference Card - Scenario 2: Dependency Confusion

Use this as your runbook for Scenario 2 when you are teaching live or practicing quickly.

## 📋 Initial Setup

```bash
# 1. Navigate to scenario
cd scenarios/02-dependency-confusion

# 2. Enable testbench mode
export TESTBENCH_MODE=enabled

# 3. Run scenario setup
./setup.sh
```

## 🎯 Attack Execution

```bash
# 1. Create malicious package
cd attacker-packages/@techcorp/auth-lib
cp ../../templates/dependency-confusion-template.js index.js

# 2. Create package.json with high version
cat > package.json << 'EOF'
{
  "name": "@techcorp/auth-lib",
  "version": "999.999.999",
  "description": "TechCorp Authentication Library [MALICIOUS - EDUCATIONAL]",
  "main": "index.js"
}
EOF

# 3. Start mock server (from scenario root — run ./setup.sh first)
cd ../../..
node infrastructure/mock-server.js &

# 4. Install malicious package in corporate app
cd corporate-app
rm -rf node_modules package-lock.json
npm install ../attacker-packages/@techcorp/auth-lib

# 5. Run victim application
export TESTBENCH_MODE=enabled
npm start

# 6. Check captured data
curl http://localhost:3000/captured-data
```

## 🔍 Detection Commands

```bash
# Version anomaly detection
cd detection-tools
node dependency-confusion-scanner.js ../corporate-app

# Check installed version
cd ../corporate-app
npm list @techcorp/auth-lib

# Check package source
cat package-lock.json | grep -A 5 "@techcorp/auth-lib"

# Inspect installed package
cat node_modules/@techcorp/auth-lib/package.json
cat node_modules/@techcorp/auth-lib/index.js | head -50
```

## 🛡️ Prevention Commands

```bash
# Configure scope restrictions (.npmrc)
cd corporate-app
cat > .npmrc << 'EOF'
@techcorp:registry=http://localhost:4873/
registry=https://registry.npmjs.org/
EOF

# Verify configuration
npm config list

# Test with proper configuration
rm -rf node_modules package-lock.json
npm install
npm list @techcorp/auth-lib
```

## 📁 Important File Locations

```text
scenarios/02-dependency-confusion/
├── infrastructure/mock-server.js     # After ./setup.sh — exfil receiver
├── internal-packages/@techcorp/     # Legitimate internal packages
│   ├── auth-lib/                   # Authentication library
│   ├── data-utils/                 # Data utilities
│   └── api-client/                 # API client
├── attacker-packages/@techcorp/    # Malicious packages
│   └── auth-lib/                   # Malicious version
├── corporate-app/                   # Victim application
├── leaked-data/                    # Simulated leaked package.json
└── detection-tools/                 # Detection scripts
```

## 🛠️ Useful Commands

```bash
# View leaked data (reconnaissance)
cat leaked-data/package.json

# Check internal packages
ls -la internal-packages/@techcorp/

# View validation script
cat corporate-app/scripts/validate-dependencies.js

# Check registry configuration
npm config get registry
cat .npmrc

# Clear and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Wrong version installed | Check `.npmrc` configuration, verify registry settings |
| Package not found | Verify path: `npm install ../attacker-packages/@techcorp/auth-lib` |
| .npmrc not working | Ensure file is in project root, check npm config |
| Mock server not running | From `scenarios/02-dependency-confusion`: `node infrastructure/mock-server.js &` (after `./setup.sh`) |

## 📚 Documentation Links

If you need more context than the commands above, these are the right deep links.

- Full Guide: `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_02.md`
- Scenario README: `scenarios/02-dependency-confusion/README.md`
- Setup Guide: `documentation/SETUP.md`
- Best Practices: `documentation/BEST_PRACTICES.md`

## 💡 Key Concepts

- **Dependency Confusion**: Public package with same name as private package
- **Version Priority**: Higher version numbers win in resolution
- **Scope Restrictions**: `.npmrc` must configure `@scope:registry` for private packages
- **Detection**: Look for unusually high version numbers (999.x)
- **Prevention**: Always configure scope-specific registries

