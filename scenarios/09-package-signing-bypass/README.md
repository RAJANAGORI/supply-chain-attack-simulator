# Scenario 9: Package Signing Bypass Attack 🎯




> **Live crypto mechanism:** `setup.sh` generates a real **Ed25519 keypair** (Node.js built-in `crypto`) and signs *both* the legitimate v1.0.0 and the attacker's v1.0.1 package with the same private key. `infrastructure/verify-signature.js` performs a genuine `crypto.verify()` — and **both packages pass**. The detection tool then finds the CRITICAL indicator: the malicious postinstall. This is the authentic key-compromise signing bypass: valid signatures everywhere, danger in the behaviour.



## Table of Contents

<div class="doc-toc">

- [🎓 Learning Objectives](#🎓-learning-objectives)
- [📖 Background](#📖-background)
- [🎯 Scenario Description](#🎯-scenario-description)
- [🔧 Setup](#🔧-setup)
- [Run the lab](#run-the-lab)
- [📝 Lab Tasks](#📝-lab-tasks)
- [Mitigation Playbook](#mitigation-playbook)
- [📊 Key Takeaways](#📊-key-takeaways)
- [🔍 Real-World Impact](#🔍-real-world-impact)
- [⚠️ Safety & Ethics](#⚠️-safety--ethics)

</div>

---
## 🎓 Learning Objectives

By completing this scenario, you will learn:
- How package signing and verification works
- How attackers bypass signature verification by compromising signing keys
- Techniques to detect signature anomalies
- Key rotation procedures
- Certificate chain validation
- Real-world examples of signing key compromises

## 📖 Background

**Package Signing Bypass** occurs when attackers compromise package signing keys and use them to sign malicious packages. Since the packages are signed with legitimate keys, they appear trusted and verified, bypassing signature verification checks.

### Why This Attack is Dangerous

1. **Trust in Signatures**: Signatures are meant to verify authenticity
2. **Complete Trust**: Verified signatures are trusted completely
3. **Wide Distribution**: Signed malicious packages look legitimate
4. **Hard to Detect**: Packages pass signature verification
5. **Key Compromise**: Once keys are compromised, all packages can be signed

### Real-World Examples

- **SolarWinds (2020)**: Code signing certificates compromised, malicious updates signed with legitimate keys
- **Multiple npm packages**: Maintainer signing keys compromised, malicious versions signed
- **Various supply chain attacks**: Compromised signing keys used to sign malicious updates

## 🎯 Scenario Description

**Scenario**: A popular npm package `secure-utils` uses package signing for security. An attacker has compromised the maintainer's signing keys and is publishing malicious versions signed with the legitimate keys. Your task is to:

1. **Red Team**: Execute a signing bypass attack
2. **Blue Team**: Detect the signature anomaly
3. **Security Team**: Implement key rotation and validation

## 🔧 Setup

### Prerequisites
- Node.js 16+ and npm installed
- Git installed
- Basic understanding of code signing concepts

### Environment Setup

```bash
cd scenarios/09-package-signing-bypass
export TESTBENCH_MODE=enabled
./setup.sh
```

`./setup.sh` installs `victim-app/` dependencies, writes `infrastructure/mock-server.js`, initializes capture data, and prepares `detection-tools/signature-validator.js` plus legitimate and compromised `secure-utils/` packages. When setup finishes, it prints the same numbered flow as **Run the lab** below.

## Run the lab

Use two terminals (or background the mock server). All paths are relative to `scenarios/09-package-signing-bypass`.

### Terminal A — mock attacker server

```bash
node infrastructure/mock-server.js
```

### Terminal B — real Ed25519 verification + attack + detection

```bash
# 1. See both packages pass real cryptographic verification (same stolen key!)
node infrastructure/verify-signature.js legitimate-package/secure-utils
node infrastructure/verify-signature.js compromised-package/secure-utils

# 2. Install the compromised package (signature passes; postinstall exfiltrates)
cd victim-app
npm install
export TESTBENCH_MODE=enabled && npm start

# 3. Deep-scan the installed package — catches malicious postinstall despite valid sig
node ../detection-tools/signature-validator.js node_modules/secure-utils
```

### Verify capture

```bash
curl -s http://localhost:3000/captured-data
```

### Key insight

Both `verify-signature.js` calls show `✅ VALID` because the attacker used the **same stolen Ed25519 private key** to sign their malicious `v1.0.1`. Signature verification alone is blind to this. The detection tool's **behavioural analysis** (`🚨 CRITICAL: postinstall.js contains network exfiltration`) is what catches it.

## 📝 Lab Tasks

The sections below expand on **Run the lab** with analysis, detection, and prevention exercises.

### Part 1: Understanding Package Signing (20 minutes)

**Package Signing Basics**:
- Packages are signed with private keys
- Public keys verify signatures
- Signatures prove authenticity and integrity
- Compromised keys can sign malicious packages

**Your Tasks**:
- Examine the legitimate package
- Understand signature verification
- Review signing key setup

```bash
cd legitimate-package/secure-utils
cat package.json
cat SIGNATURE.md  # Explains signing process
```

### Part 2: The Attack - Key Compromise (25 minutes)

**Attack Scenario**: Attacker has compromised the maintainer's signing keys.

```bash
cd compromised-package/secure-utils
cat package.json
cat SIGNATURE.md  # Shows compromised signature
```

**What Happens**:
1. Attacker compromises signing keys
2. Creates malicious package version
3. Signs malicious package with compromised keys
4. Signature verification passes (keys are legitimate)
5. Malicious package appears trusted

### Part 3: Detection Methods (30 minutes)

**Detection Techniques**:
- Signature verification
- Key fingerprint comparison
- Certificate chain validation
- Timestamp analysis
- Behavioral analysis

See detection tools and README for detailed detection methods.

### Part 4: Incident Response (25 minutes)

**Response Steps**:
1. Revoke compromised keys
2. Rotate to new keys
3. Re-sign legitimate packages
4. Notify users of compromise
5. Update signature verification

## Mitigation Playbook

### Prevention

1. **Key Protection**: Secure storage of private keys
2. **Multi-factor Authentication**: Protect key access
3. **Key Rotation**: Regular key rotation procedures
4. **Hardware Security Modules**: Use HSMs for key storage
5. **Access Controls**: Limit who can sign packages

### Detection

1. **Signature Verification**: Always verify signatures
2. **Key Fingerprint Checking**: Verify key fingerprints
3. **Certificate Chain Validation**: Validate certificate chains
4. **Timestamp Analysis**: Check signature timestamps
5. **Behavioral Monitoring**: Monitor for unusual signing activity

### Response

1. **Immediate Key Revocation**: Revoke compromised keys immediately
2. **Key Rotation**: Generate and distribute new keys
3. **Package Re-signing**: Re-sign legitimate packages with new keys
4. **User Notification**: Notify users of the compromise
5. **Incident Documentation**: Document the attack and response

## 📊 Key Takeaways

### Why Signing Bypass is Dangerous

1. **Complete Trust**: Signatures are trusted completely
2. **Key Compromise**: One compromise affects all packages
3. **Hard to Detect**: Packages pass verification
4. **Wide Impact**: Affects all users who trust the keys
5. **Persistent Attack**: Compromised keys can sign many packages

### Best Practices

1. ✅ **Protect signing keys** - Use secure storage and access controls
2. ✅ **Verify signatures** - Always verify package signatures
3. ✅ **Check key fingerprints** - Verify key authenticity
4. ✅ **Rotate keys regularly** - Implement key rotation procedures
5. ✅ **Use HSMs** - Hardware Security Modules for key storage
6. ✅ **Monitor signing activity** - Detect unusual signing patterns
7. ✅ **Implement multi-factor auth** - Protect key access

## 🔍 Real-World Impact

- **SolarWinds**: Code signing certificates compromised, thousands of systems affected
- **npm packages**: Maintainer keys compromised, malicious signed packages distributed
- **Detection time**: Often weeks or months before discovery

## ⚠️ Safety & Ethics

**IMPORTANT**: This scenario is for **educational purposes only**.

- ✅ Use ONLY in isolated test environments
- ✅ Never deploy malicious code to production
- ✅ All malicious code requires `TESTBENCH_MODE=enabled`
- ✅ Signatures are simulated for educational purposes

---

**Remember**: Package signing provides security only if keys are protected. Compromised keys can sign malicious packages that appear legitimate!

🔐 Happy Learning!

