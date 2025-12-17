# 🚀 Quick Reference Card - Scenario 3: Compromised Package

A cheat sheet of essential commands for Scenario 3: Compromised Package Attack

## 📋 Initial Setup

```bash
# 1. Navigate to scenario
cd scenarios/03-compromised-package

# 2. Enable testbench mode
export TESTBENCH_MODE=enabled

# 3. Run scenario setup
./setup.sh
```

## 🎯 Attack Execution

```bash
# 1. Examine legitimate package
cd legitimate-package/secure-validator
cat package.json
cat index.js

# 2. Examine compromised package
cd ../../compromised-package/secure-validator
cat package.json
cat index.js

# 3. Start mock server (if not using Docker)
node ../../01-typosquatting/infrastructure/mock-server.js &

# 4. Install compromised package
cd ../../victim-app
npm install ../compromised-package/secure-validator

# 5. Run victim application
export TESTBENCH_MODE=enabled
npm start

# 6. Check captured data
curl http://localhost:3000/captured-data
```

## 🔍 Forensic Investigation

```bash
# Compare versions
diff -ur legitimate-package/secure-validator compromised-package/secure-validator

# Generate detailed diff
diff -ur legitimate-package/secure-validator compromised-package/secure-validator > compromise-diff.txt
cat compromise-diff.txt

# Check installed version
cd victim-app
npm list secure-validator

# Inspect installed package
cat node_modules/secure-validator/package.json
cat node_modules/secure-validator/index.js | head -50
```

## 🛡️ Detection Commands

```bash
# Run security audit
npm audit

# Check package integrity
npm audit --audit-level=moderate

# Monitor network traffic
cd ../..
./detection-tools/network-monitor.sh

# Check package lock
git diff package-lock.json
```

## 🚨 Incident Response

```bash
# Immediate containment
npm uninstall secure-validator
npm cache clean --force

# Impact assessment
npm view secure-validator versions

# Remediation - Pin to safe version
# Edit package.json:
# "secure-validator": "2.5.3"  // Last known good version

# Or replace package
npm uninstall secure-validator
npm install validator  # Alternative
```

## 📁 Important File Locations

```
scenarios/03-compromised-package/
├── legitimate-package/secure-validator/  # Legitimate version 2.5.3
├── compromised-package/secure-validator/ # Compromised version 2.5.4
├── victim-app/                          # Victim application
└── templates/                           # Package templates
```

## 🛠️ Useful Commands

```bash
# View package details
npm list secure-validator

# Check package version history (simulated)
# npm view secure-validator time

# Compare package.json files
diff legitimate-package/secure-validator/package.json compromised-package/secure-validator/package.json

# Check for suspicious code patterns
grep -r "http" node_modules/secure-validator/
grep -r "process.env" node_modules/secure-validator/
```

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Package not found | Verify path: `npm install ../compromised-package/secure-validator` |
| No data captured | Check TESTBENCH_MODE, verify mock server is running |
| Diff shows no differences | Ensure both directories exist, check file paths |
| Wrong version installed | Clear cache: `npm cache clean --force` |

## 📚 Documentation Links

- Full Guide: `docs/ZERO_TO_HERO_SCENARIO_03.md`
- Scenario README: `scenarios/03-compromised-package/README.md`
- Setup Guide: `docs/SETUP.md`
- Best Practices: `docs/BEST_PRACTICES.md`

## 💡 Key Concepts

- **Package Compromise**: Legitimate package hijacked by attacker
- **Account Takeover**: Attacker gains maintainer credentials
- **Stealth**: Malicious code hidden in legitimate package
- **Detection**: Look for code changes in patch versions
- **Response**: Immediate containment, impact assessment, remediation
- **Prevention**: Package lock files, dependency pinning, automated scanning

