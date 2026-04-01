# 🚀 Zero to Hero: Scenario 9 - Package Signing Bypass

Welcome! This guide will take you from zero knowledge to successfully completing the Package Signing Bypass attack scenario.

## 📚 What You'll Learn

By the end of this guide, you will:
- Understand how package signing and verification works
- Learn how attackers bypass signature verification by compromising keys
- Execute a signing bypass simulation (safely)
- Conduct signature validation and forensic investigation
- Perform incident response and key rotation
- Implement defense strategies

---

## Part 1: Understanding Package Signing (15 minutes)

### What is Package Signing?

**Package signing** is a security mechanism that uses cryptographic signatures to verify the authenticity and integrity of packages. Packages are signed with private keys and verified with public keys.

**How it works:**
1. Maintainer signs package with private key
2. Signature attached to package
3. Users verify signature with public key
4. Signature proves package hasn't been tampered with

### Why Signing is Important

- **Authenticity**: Proves package comes from legitimate source
- **Integrity**: Ensures package hasn't been modified
- **Trust**: Users can trust signed packages
- **Security**: Prevents tampering and substitution attacks

### The Signing Bypass Attack

**The Problem**: If signing keys are compromised, attackers can:
- Sign malicious packages with legitimate keys
- Packages pass signature verification
- Users trust the packages (signatures are valid)
- Malicious code executes despite valid signatures

---

## Part 2: Prerequisites Check (5 minutes)

Before we start, make sure you've completed:

- ✅ Scenarios 1-3 (Basic attack understanding)
- ✅ Node.js 16+ and npm installed
- ✅ TESTBENCH_MODE enabled

Verify your setup:

```bash
node --version
npm --version
echo $TESTBENCH_MODE  # Should output: enabled
```

---

## Part 3: Setting Up Scenario 9 (15 minutes)

### Step 1: Navigate to Scenario Directory

```bash
cd scenarios/09-package-signing-bypass
```

### Step 2: Run the Setup Script

```bash
export TESTBENCH_MODE=enabled
./setup.sh
```

**What this does:**
- Creates directory structure
- Sets up legitimate signed package
- Creates compromised signed package
- Sets up victim application
- Creates detection tools

---

## Part 4: Understanding the Legitimate Package (20 minutes)

### Step 1: Examine the Legitimate Package

```bash
cd legitimate-package/secure-utils
cat package.json
```

**What you'll see:**
```json
{
  "signing": {
    "keyId": "0xABC12345",
    "keyFingerprint": "ABCD 1234 EFGH 5678 90AB CDEF 1234 5678 90AB CDEF",
    "signedBy": "Secure Tools Inc. <security@securetools.com>",
    "signatureDate": "2024-01-15T10:30:00Z"
  }
}
```

### Step 2: Review Signature Information

```bash
cat SIGNATURE.md
```

**Key Information:**
- Key ID: Identifies the signing key
- Key Fingerprint: Unique identifier for the key
- Signed By: Who signed the package
- Signature Date: When it was signed

---

## Part 5: The Attack - Key Compromise (30 minutes)

### Step 1: Understand the Compromise

**Scenario**: Attacker has compromised the maintainer's signing keys.

**Attack Steps:**
1. Attacker gains access to signing keys (phishing, credential theft, etc.)
2. Creates malicious package version
3. Signs malicious package with compromised keys
4. Signature verification passes (keys are legitimate!)
5. Malicious package appears trusted

### Step 2: Examine the Compromised Package

```bash
cd ../../compromised-package/secure-utils
cat package.json
cat SIGNATURE.md
```

**Key Changes:**
- Version: 1.0.0 → 1.0.1 (seems like normal update)
- Signature: Still valid (signed with legitimate keys!)
- Postinstall script: Added malicious code

**Critical Point**: Signature verification PASSES because keys are legitimate (but compromised)!

### Step 3: Start the Mock Attacker Server

```bash
cd ../../infrastructure
node mock-server.js &
```

### Step 4: Simulate the Attack

```bash
cd ../victim-app
npm install
export TESTBENCH_MODE=enabled
npm start
```

**What happens:**
1. Package signature verification passes
2. Package appears legitimate
3. Postinstall script executes
4. Data is exfiltrated
5. Attack succeeds despite valid signature!

---

## Part 6: Detection Methods (40 minutes)

### Detection Method 1: Signature Validation

```bash
cd detection-tools
node signature-validator.js ../compromised-package/secure-utils
```

**What to look for:**
- Signature information exists
- Key fingerprint matches
- BUT: Behavioral analysis reveals malicious code

### Detection Method 2: Behavioral Analysis

**Key Insight**: Signature verification alone is insufficient!

**Detection Techniques:**
- Check for postinstall scripts in signed packages
- Analyze script content for malicious behavior
- Monitor package behavior at runtime
- Compare package versions for unexpected changes

### Detection Method 3: Key Compromise Detection

**Monitor for:**
- Unusual signing activity
- Signatures from unexpected locations
- Signatures at unusual times
- Multiple packages signed in short time

---

## Part 7: Forensic Investigation (30 minutes)

### Investigation Step 1: Signature Analysis

```bash
cd compromised-package/secure-utils
cat package.json | jq '.signing'
```

**Findings:**
- Signature: Valid
- Key fingerprint: Matches expected value
- Signed by: Legitimate maintainer
- **Conclusion**: Keys are legitimate but compromised!

### Investigation Step 2: Behavioral Analysis

```bash
cat postinstall.js
```

**Findings:**
- Postinstall script contains data exfiltration
- Script collects sensitive information
- Network requests to attacker server
- **Conclusion**: Package is malicious despite valid signature!

---

## Part 8: Incident Response (30 minutes)

### Response Step 1: Immediate Containment

```bash
cd ../../victim-app
npm uninstall secure-utils
npm cache clean --force
```

### Response Step 2: Key Rotation

**Critical Actions:**
1. **Revoke compromised keys immediately**
2. **Generate new signing keys**
3. **Re-sign legitimate packages with new keys**
4. **Distribute new public keys to users**
5. **Notify users of key compromise**

### Response Step 3: Package Re-signing

```bash
# After key rotation, re-sign legitimate packages
# This would be done by the maintainer
```

---

## Part 9: Defense Strategies (20 minutes)

### Prevention

1. **Key Protection**: Secure storage of private keys (HSMs)
2. **Multi-factor Authentication**: Protect key access
3. **Key Rotation**: Regular key rotation procedures
4. **Access Controls**: Limit who can sign packages
5. **Monitoring**: Monitor signing activity for anomalies

### Detection

1. **Signature Verification**: Always verify signatures (but not sufficient alone!)
2. **Behavioral Analysis**: Analyze package behavior
3. **Key Monitoring**: Monitor key usage for anomalies
4. **Timestamp Analysis**: Check for unusual signing times
5. **Content Review**: Review package content even if signature is valid

### Response

1. **Immediate Key Revocation**: Revoke compromised keys
2. **Key Rotation**: Generate and distribute new keys
3. **Package Re-signing**: Re-sign legitimate packages
4. **User Notification**: Notify users of compromise
5. **Incident Documentation**: Document attack and response

---

## Part 10: Key Takeaways (10 minutes)

### Why Signing Bypass is Dangerous

1. **Complete Trust**: Signatures are trusted completely
2. **Key Compromise**: One compromise affects all packages
3. **Hard to Detect**: Packages pass verification
4. **Wide Impact**: Affects all users who trust the keys
5. **Persistent Attack**: Compromised keys can sign many packages

### Best Practices

1. ✅ **Protect signing keys** - Use secure storage and HSMs
2. ✅ **Verify signatures** - Always verify package signatures
3. ✅ **Behavioral analysis** - Don't trust signatures alone
4. ✅ **Rotate keys regularly** - Implement key rotation procedures
5. ✅ **Monitor signing activity** - Detect unusual signing patterns
6. ✅ **Use multi-factor auth** - Protect key access
7. ✅ **Implement access controls** - Limit who can sign packages

---

## 🎓 Congratulations!

You've successfully completed Scenario 9: Package Signing Bypass!

**What you've learned:**
- ✅ How package signing works
- ✅ How attackers bypass signature verification
- ✅ Detection and investigation techniques
- ✅ Incident response and key rotation
- ✅ Defense strategies

---

## 📚 Additional Resources

- [npm package signing documentation](https://docs.npmjs.com/about-package-signing)
- [GPG key management](https://www.gnupg.org/gph/en/manual.html)
- [Code signing best practices](https://owasp.org/www-project-code-signing/)

🔐 Happy Learning!

