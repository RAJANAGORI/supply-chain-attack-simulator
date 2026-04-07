# 🚀 Quick Reference Card - Scenario 4: Malicious Update

Use this as your runbook for Scenario 4 when you are teaching live or practicing quickly.

## 📋 Initial Setup

```bash
# 1. Navigate to scenario
cd scenarios/04-malicious-update

# 2. Enable testbench mode
export TESTBENCH_MODE=enabled

# 3. Run scenario setup
./setup.sh
```

## 🎯 Attack Execution

```bash
# 1. Start mock server (in a separate terminal)
node ../01-typosquatting/infrastructure/mock-server.js &

# 2. Install legitimate version
cd victim-app
npm install ../legitimate-package/utils-helper
npm list utils-helper  # Should show 2.1.0

# 3. Simulate automatic update
rm -rf node_modules package-lock.json
npm install  # Will automatically get 2.1.1

# 4. Verify malicious update installed
npm list utils-helper  # Should show 2.1.1

# 5. Run victim application
export TESTBENCH_MODE=enabled
npm start

# 6. Check captured data
curl http://localhost:3000/captured-data
```

## 🔍 Detection Commands

```bash
# Compare versions
diff -ur legitimate-package/utils-helper malicious-update/utils-helper

# Check for suspicious patterns
grep -n "http\|process.env\|eval" malicious-update/utils-helper/index.js

# Run update scanner
cd detection-tools
node update-scanner.js ../victim-app

# Check version ranges
cat victim-app/package.json | grep utils-helper
```

## 🛡️ Prevention Commands

```bash
# Pin exact version
# Edit package.json:
# "utils-helper": "2.1.0"  // Not ^2.1.0

# Use package lock file
git add package-lock.json
git commit -m "Lock dependencies"

# Use npm ci in CI/CD
npm ci

# Verify before updating
npm view utils-helper@2.1.1
# Review changelog, check for suspicious changes
```

## 📁 Important File Locations

```text
scenarios/04-malicious-update/
├── legitimate-package/utils-helper/  # Legitimate version 2.1.0
├── malicious-update/utils-helper/   # Malicious update 2.1.1
├── victim-app/                       # Victim application
└── detection-tools/                  # Detection scripts
```

## 🛠️ Useful Commands

```bash
# Check installed version
npm list utils-helper

# View package.json version range
cat victim-app/package.json | grep utils-helper

# Compare package files
diff legitimate-package/utils-helper/package.json malicious-update/utils-helper/package.json

# Check for automatic update vulnerability
cd detection-tools
node update-scanner.js ../victim-app
```

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Wrong version installed | Check version range in package.json, use exact version |
| Update not happening | Clear cache: `npm cache clean --force`, remove node_modules |
| No data captured | Check TESTBENCH_MODE, verify mock server is running |

## 📚 Documentation Links

If you need more context than the commands above, these are the right deep links.

- Full Guide: `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_04.md`
- Scenario README: `scenarios/04-malicious-update/README.md`
- Setup Guide: `documentation/SETUP.md`
- Best Practices: `documentation/BEST_PRACTICES.md`

## 💡 Key Concepts

- **Malicious Updates**: Trojan updates to trusted packages
- **Version Ranges**: `^2.1.0` allows automatic updates to 2.1.1, 2.2.0, etc.
- **Automatic Updates**: `npm install` or `npm update` pulls latest compatible version
- **Detection**: Look for code changes in patch versions, suspicious patterns
- **Prevention**: Pin exact versions, use package lock files, verify updates

