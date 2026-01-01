# 🚀 Quick Reference Card - Scenario 9: Package Signing Bypass

A cheat sheet of essential commands for Scenario 9: Package Signing Bypass Attack

## 📋 Initial Setup

```bash
# 1. Navigate to scenario
cd scenarios/09-package-signing-bypass

# 2. Enable testbench mode
export TESTBENCH_MODE=enabled

# 3. Run scenario setup
./setup.sh
```

## 🎯 Attack Execution

```bash
# 1. Compare legitimate vs compromised packages
cd legitimate-package/secure-utils
cat package.json
cat SIGNATURE.md

cd ../../compromised-package/secure-utils
cat package.json
cat SIGNATURE.md  # Shows compromised signature

# 2. Start mock server
cd ../../infrastructure
node mock-server.js &

# 3. Install compromised package
cd ../victim-app
npm install

# 4. Run victim application
export TESTBENCH_MODE=enabled
npm start

# 5. Check captured data
curl http://localhost:3000/captured-data
```

## 🔍 Detection Commands

```bash
# Run signature validator
cd detection-tools
node signature-validator.js ../compromised-package/secure-utils

# Check signature information
cd ../compromised-package/secure-utils
cat package.json | jq '.signing'

# Compare key fingerprints
echo "Expected: ABCD 1234 EFGH 5678 90AB CDEF 1234 5678 90AB CDEF"
cat package.json | jq -r '.signing.keyFingerprint'

# Check for postinstall scripts in signed packages
cat package.json | jq '.scripts.postinstall'
```

## 🛡️ Forensic Investigation

```bash
# Compare package signatures
diff legitimate-package/secure-utils/SIGNATURE.md compromised-package/secure-utils/SIGNATURE.md

# Check signature details
cat compromised-package/secure-utils/package.json | jq '.signing'

# Analyze package behavior
node detection-tools/signature-validator.js compromised-package/secure-utils
```

## 🚨 Incident Response

```bash
# Immediate containment
npm uninstall secure-utils
npm cache clean --force

# Key rotation (simulated)
# 1. Revoke compromised keys
# 2. Generate new signing keys
# 3. Re-sign legitimate packages
# 4. Distribute new public keys

# Verify new signatures
node detection-tools/signature-validator.js legitimate-package/secure-utils
```

## 📁 Important File Locations

```
scenarios/09-package-signing-bypass/
├── legitimate-package/secure-utils/    # Legitimate signed package
├── compromised-package/secure-utils/   # Compromised signed package
├── victim-app/                         # Victim application
├── infrastructure/
│   └── mock-server.js                  # Mock attacker server
├── detection-tools/
│   └── signature-validator.js          # Signature validation tool
└── templates/                          # Attack templates
```

## 🛠️ Useful Commands

```bash
# Verify signature information
cat package.json | jq '.signing'

# Check key fingerprint
cat package.json | jq -r '.signing.keyFingerprint'

# Compare signatures
diff legitimate-package/secure-utils/SIGNATURE.md compromised-package/secure-utils/SIGNATURE.md

# Check for malicious behavior
node detection-tools/signature-validator.js .
```

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Signature validation passes but package is malicious | Keys may be compromised - use behavioral analysis |
| Cannot find signature information | Check package.json for .signing field |
| Key fingerprint matches but package is suspicious | Keys compromised - need key rotation |
| Postinstall script in signed package | Review script content for malicious behavior |

## 📚 Documentation Links

- Full Guide: `docs/ZERO_TO_HERO_SCENARIO_09.md`
- Scenario README: `scenarios/09-package-signing-bypass/README.md`
- Setup Guide: `docs/SETUP.md`
- Best Practices: `docs/BEST_PRACTICES.md`

## 💡 Key Concepts

- **Package Signing**: Packages signed with private keys, verified with public keys
- **Key Compromise**: Attacker gains access to signing keys
- **Signature Bypass**: Valid signatures on malicious packages (keys compromised)
- **Detection**: Signature verification alone insufficient - need behavioral analysis
- **Key Rotation**: Revoke compromised keys, generate new ones, re-sign packages
- **Prevention**: Protect signing keys, use HSMs, implement multi-factor auth

## 🔑 Key Commands Cheat Sheet

```bash
# Setup
cd scenarios/09-package-signing-bypass && export TESTBENCH_MODE=enabled && ./setup.sh

# Attack
node infrastructure/mock-server.js &
cd victim-app && npm install && npm start

# Detection
node detection-tools/signature-validator.js compromised-package/secure-utils
cat compromised-package/secure-utils/package.json | jq '.signing'

# Response
npm uninstall secure-utils && npm cache clean --force
```

