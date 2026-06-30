# 🚀 Quick Reference Card - Scenario 9: Package Signing Bypass

Use this as your runbook for Scenario 9 when you are teaching live or practicing quickly.



## Table of Contents

<div class="doc-toc">

- [📋 Initial Setup](#📋-initial-setup)
- [🎯 Attack Execution](#🎯-attack-execution)
- [🔍 Detection Commands](#🔍-detection-commands)
- [🛡️ Forensic Investigation](#🛡️-forensic-investigation)
- [🚨 Incident Response](#🚨-incident-response)
- [📁 Important File Locations](#📁-important-file-locations)
- [🛠️ Useful Commands](#🛠️-useful-commands)
- [🆘 Quick Troubleshooting](#🆘-quick-troubleshooting)
- [📚 Documentation Links](#📚-documentation-links)
- [💡 Key Concepts](#💡-key-concepts)
- [🔑 Key Commands Cheat Sheet](#🔑-key-commands-cheat-sheet)

</div>

---
## 📋 Initial Setup

```bash
cd scenarios/09-package-signing-bypass
export TESTBENCH_MODE=enabled
./setup.sh
```

`setup.sh` generates Ed25519 keys and signs both legitimate and compromised packages.

## 🎯 Attack Execution

```bash
# Terminal A — mock C2
node infrastructure/mock-server.js

# Terminal B — verify BOTH packages pass crypto (key compromise demo)
node infrastructure/verify-signature.js legitimate-package/secure-utils
node infrastructure/verify-signature.js compromised-package/secure-utils

# Install compromised package (signature valid; postinstall exfiltrates)
cd victim-app
npm install
export TESTBENCH_MODE=enabled && npm start

curl -s http://localhost:3000/captured-data
```

## 🔍 Detection Commands

```bash
# Real Ed25519 verify + behavioural scan (catches malicious postinstall)
node detection-tools/signature-validator.js compromised-package/secure-utils
node detection-tools/signature-validator.js victim-app/node_modules/secure-utils

cat compromised-package/secure-utils/package.sig | jq '.keyFingerprint, .label'
cat scenarios/09-package-signing-bypass/DETECT.md
```

## 🛡️ Forensic Investigation

```bash
# Compare signatures — same key, different content hash
diff <(jq -S . legitimate-package/secure-utils/package.sig) \
     <(jq -S . compromised-package/secure-utils/package.sig)

cat compromised-package/secure-utils/postinstall.js
cat infrastructure/keys/key-info.json
```

## 🚨 Incident Response

```bash
cd victim-app
npm uninstall secure-utils
npm cache clean --force

# Lab key rotation (production: revoke HSM key, re-sign all packages)
node infrastructure/keygen.js
node infrastructure/sign-package.js legitimate-package/secure-utils "re-signed v1.0.0"
```

## 📁 Important File Locations

```text
scenarios/09-package-signing-bypass/
├── infrastructure/
│   ├── keygen.js              # Ed25519 keypair generator
│   ├── sign-package.js        # Signs package → package.sig
│   ├── verify-signature.js    # Real crypto.verify() demo
│   ├── keys/                  # Lab keypair (gitignored)
│   └── mock-server.js
├── legitimate-package/secure-utils/package.sig
├── compromised-package/secure-utils/package.sig
└── detection-tools/signature-validator.js
```

## 🛠️ Useful Commands

```bash
node infrastructure/sign-package.js compromised-package/secure-utils "attacker re-sign"
cat legitimate-package/secure-utils/package.sig | jq .
curl -X DELETE http://localhost:3000/captured-data
```

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Public key not found | Re-run `./setup.sh` or `node infrastructure/keygen.js` |
| Both packages show VALID | Expected — demonstrates key compromise; use behavioural scanner |
| No capture | `export TESTBENCH_MODE=enabled` before `npm install`; mock server on :3000 |
| package.sig missing | `node infrastructure/sign-package.js <pkg-dir>` |

## 📚 Documentation Links

- Full Guide: `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_09.md`
- Scenario README: `scenarios/09-package-signing-bypass/README.md`
- Detection runbook: `scenarios/09-package-signing-bypass/DETECT.md`

## 💡 Key Concepts

- **Ed25519 signing**: Real `crypto.sign` / `crypto.verify` in this lab
- **Key compromise**: Attacker signs malicious package with stolen private key
- **Both pass verification**: Signature validity ≠ package safety
- **Behavioural detection**: Postinstall exfil patterns catch what crypto misses
- **Defence**: HSM, Sigstore transparency logs, SBOM hash pinning

## 🔑 Key Commands Cheat Sheet

```bash
./setup.sh
node infrastructure/verify-signature.js legitimate-package/secure-utils
node infrastructure/verify-signature.js compromised-package/secure-utils
cd victim-app && npm install && TESTBENCH_MODE=enabled npm start
node detection-tools/signature-validator.js compromised-package/secure-utils
```
