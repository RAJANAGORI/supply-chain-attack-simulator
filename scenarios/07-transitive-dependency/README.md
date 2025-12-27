# Scenario 7: Transitive Dependency Attack 🎯

## 🎓 Learning Objectives

By completing this scenario, you will learn:
- How transitive dependency attacks work
- Why transitive dependencies are hard to detect
- How to audit entire dependency trees
- Techniques to detect compromised transitive dependencies
- Defense strategies for transitive dependency attacks
- Real-world examples of transitive dependency compromises

## 📖 Background

**Transitive Dependency Attack** occurs when an attacker compromises a package that is used as a dependency by other packages. When victims install the parent package, they automatically get the compromised transitive dependency, and malicious code executes even though the victim never directly installed the compromised package.

### Why This Attack is Dangerous

1. **Hidden from View**: Victims don't directly control transitive dependencies
2. **Hard to Detect**: Victim never installed the malicious package directly
3. **Wide Impact**: Affects all packages that depend on the compromised package
4. **Automatic Execution**: Postinstall scripts run automatically during `npm install`
5. **Trust Chain**: Victim trusts the parent package, not the transitive dependency

### Real-World Examples

- **event-stream → flatmap-stream (2018)**:
  - `event-stream` (2M weekly downloads) depended on `flatmap-stream`
  - Attacker compromised `flatmap-stream` and added cryptocurrency stealer
  - Affected Copay Bitcoin wallet and thousands of projects
  - Went undetected for weeks

- **Multiple npm packages (2021)**:
  - Several packages compromised through transitive dependencies
  - Affected React, Vue, Angular projects
  - Credential theft and data exfiltration

- **coa & rc (2021)**:
  - Maintainer account compromised
  - Password stealer injected
  - Spread through transitive dependencies to major frameworks

## 🎯 Scenario Description

**Scenario**: You are a developer using the `web-utils` package (legitimate, trusted). However, `web-utils` depends on `data-processor` (a transitive dependency). An attacker has compromised `data-processor` and published a malicious version. Your task is to:

1. **Red Team**: Execute a transitive dependency attack
2. **Blue Team**: Detect the compromised transitive dependency
3. **Security Team**: Implement defenses and incident response

## 🔧 Setup

### Prerequisites
- Node.js 16+ and npm installed
- Basic understanding of npm dependencies

### Environment Setup

```bash
cd scenarios/07-transitive-dependency
export TESTBENCH_MODE=enabled
./setup.sh
```

## 📝 Lab Tasks

### Part 1: Understanding the Dependency Tree (15 minutes)

**Dependency Structure**:

```
victim-app
└── web-utils (direct dependency)
    └── data-processor (transitive dependency) ⚠️ COMPROMISED
```

**Your Tasks**:
- Examine the victim application at `./victim-app/`
- Review the parent package `web-utils` at `./legitimate-packages/web-utils/`
- Understand the dependency relationship
- Identify the transitive dependency

```bash
# View victim app dependencies
cd victim-app
cat package.json

# View parent package
cat ../legitimate-packages/web-utils/package.json

# View transitive dependency
cat ../legitimate-packages/data-processor/package.json
```

**Questions**:
- What is the direct dependency?
- What is the transitive dependency?
- Why doesn't the victim directly control the transitive dependency?

### Part 2: The Attack (20 minutes)

**Attacker Perspective**: How does the attack work?

1. **Compromise the Transitive Dependency**:
   ```bash
   # Review the compromised version
   cat ../compromised-packages/data-processor/package.json
   cat ../compromised-packages/data-processor/postinstall.js
   ```

2. **Start the Mock Attacker Server**:
   ```bash
   # In a separate terminal
   node infrastructure/mock-server.js
   ```

3. **Install the Compromised Dependency**:
   ```bash
   cd victim-app
   
   # Clean install to simulate fresh installation
   rm -rf node_modules package-lock.json
   
   # Install dependencies (this will install web-utils)
   npm install
   
   # Replace legitimate data-processor with compromised version
   # (In real attack, this would happen automatically from npm registry)
   cp -r ../compromised-packages/data-processor node_modules/data-processor
   
   # Reinstall to trigger postinstall script
   npm install
   ```

4. **Observe the Attack**:
   - The postinstall script executes automatically
   - Data is exfiltrated to the attacker server
   - Check the mock server console for captured data

**What Happens**:
- Victim installs `web-utils` (legitimate, trusted package)
- npm automatically installs `data-processor` as a transitive dependency
- Malicious postinstall script in `data-processor` executes
- System information and sensitive files are collected
- Data is exfiltrated to attacker server
- Application continues to work normally (malicious package provides functionality)

### Part 3: Detection Methods (25 minutes)

**Your Task**: Detect the compromised transitive dependency

#### Detection Method 1: Dependency Tree Analysis

```bash
# Use the dependency tree scanner
node detection-tools/dependency-tree-scanner.js victim-app
```

**What to Look For**:
- Transitive dependencies with postinstall scripts
- Unexpected packages in dependency tree
- Suspicious version numbers

#### Detection Method 2: Manual Inspection

```bash
cd victim-app

# View the dependency tree
npm ls

# Check for postinstall scripts in transitive deps
find node_modules -name "package.json" -exec grep -l "postinstall" {} \;

# Check specific transitive dependency
cat node_modules/data-processor/package.json
```

#### Detection Method 3: Package Lock File Analysis

```bash
# View package-lock.json
cat package-lock.json | grep -A 5 "data-processor"

# Check for unexpected versions
npm audit
```

#### Detection Method 4: Runtime Monitoring

```bash
# Monitor network requests during install
# (Use network monitoring tools or check mock server logs)

# Check for unexpected file access
# (Use file system monitoring tools)
```

#### Detection Method 5: Behavioral Analysis

```bash
# Check captured data
curl http://localhost:3000/captured-data

# Analyze what data was exfiltrated
cat infrastructure/captured-data.json
```

**Detection Checklist**:
- [ ] Identify all transitive dependencies
- [ ] Check for postinstall scripts in transitive deps
- [ ] Verify package versions match expectations
- [ ] Monitor network traffic during install
- [ ] Review package-lock.json for anomalies
- [ ] Use automated scanning tools

### Part 4: Investigation & Forensics (20 minutes)

**The Attack Has Been Detected. Investigate!**

#### Investigation Step 1: Dependency Tree Reconstruction

```bash
cd victim-app

# Build complete dependency tree
npm ls --all

# Export dependency tree
npm ls --json > dependency-tree.json

# Identify all transitive dependencies
npm ls --depth=10 | grep -E "└|├" | grep -v "node_modules"
```

**Questions**:
- What is the complete dependency tree?
- Which packages are direct dependencies?
- Which packages are transitive dependencies?
- How deep is the dependency chain?

#### Investigation Step 2: Package Analysis

```bash
# Analyze the compromised package
cd node_modules/data-processor

# Check package.json
cat package.json

# Check for postinstall script
cat package.json | grep -A 5 "scripts"

# Review the postinstall script
cat postinstall.js

# Check package version
npm view data-processor versions
```

#### Investigation Step 3: Impact Assessment

```bash
# Find all projects using this package
# (In real scenario, would search across organization)

# Check which versions are affected
npm view data-processor time

# Identify when package was compromised
# (Check npm registry publish history)
```

#### Investigation Step 4: Timeline Reconstruction

```bash
# Check package-lock.json for version history
cat package-lock.json | grep -B 5 -A 10 "data-processor"

# Check when package was installed
ls -la node_modules/data-processor

# Review captured data timestamps
cat ../infrastructure/captured-data.json
```

**Build Timeline**:
- When was the package compromised?
- When was it installed in this project?
- What data was exfiltrated?
- How long was the compromise active?

### Part 5: Incident Response & Mitigation (30 minutes)

**The Attack Has Been Confirmed. Respond!**

#### Response Step 1: Immediate Containment

```bash
# 1. Remove compromised package
cd victim-app
npm uninstall web-utils

# 2. Clear npm cache
npm cache clean --force

# 3. Remove node_modules
rm -rf node_modules package-lock.json

# 4. Block the compromised package (if possible)
# Add to .npmrc or use npm audit fix
```

#### Response Step 2: Package Replacement

```bash
# 1. Find alternative package or use legitimate version
# In this case, use legitimate data-processor

# 2. Pin dependency versions
# Update package.json to pin specific versions
# Use exact versions instead of ranges: "1.2.0" not "^1.2.0"

# 3. Reinstall with legitimate packages
npm install
```

#### Response Step 3: Dependency Locking

```bash
# 1. Use package-lock.json (already in use)
# Ensure package-lock.json is committed to version control

# 2. Use npm ci for CI/CD (clean install from lock file)
npm ci

# 3. Verify package integrity
npm audit
npm audit fix
```

#### Response Step 4: Long-term Defenses

**Implement Multiple Layers**:

1. **Dependency Pinning**:
   ```json
   {
     "dependencies": {
       "web-utils": "2.1.0"  // Exact version, not "^2.1.0"
     }
   }
   ```

2. **Automated Scanning**:
   ```bash
   # Add to CI/CD pipeline
   npm audit
   npm audit --production
   ```

3. **Dependency Tree Monitoring**:
   ```bash
   # Regular dependency tree scans
   node detection-tools/dependency-tree-scanner.js .
   ```

4. **SBOM Generation**:
   ```bash
   # Generate Software Bill of Materials
   npm ls --json > sbom.json
   ```

5. **Postinstall Script Monitoring**:
   - Monitor for postinstall scripts in all dependencies
   - Alert on unexpected postinstall execution
   - Block postinstall scripts in production (if possible)

## 🛡️ Defense Strategies

### Prevention

1. **Dependency Pinning**: Use exact versions, not ranges
2. **Package Lock Files**: Always commit `package-lock.json`
3. **Automated Scanning**: Regular `npm audit` in CI/CD
4. **SBOM Generation**: Maintain Software Bill of Materials
5. **Dependency Review**: Regular review of dependency tree

### Detection

1. **Dependency Tree Scanning**: Regular scans of entire dependency tree
2. **Postinstall Monitoring**: Monitor for postinstall script execution
3. **Network Monitoring**: Detect unexpected network requests
4. **Behavioral Analysis**: Monitor for unusual package behavior
5. **Version Verification**: Verify package versions match expectations

### Response

1. **Immediate Containment**: Remove compromised packages
2. **Impact Assessment**: Determine scope of compromise
3. **Package Replacement**: Find and install legitimate alternatives
4. **Credential Rotation**: Rotate any potentially compromised credentials
5. **Incident Documentation**: Document the attack and response

## 📊 Key Takeaways

### Why Transitive Dependencies Are Risky

1. **Hidden from View**: Not directly visible in package.json
2. **Automatic Installation**: Installed automatically without explicit action
3. **Trust Chain**: Trust in parent package extends to transitive deps
4. **Wide Impact**: One compromise affects many projects
5. **Hard to Detect**: Requires deep dependency tree analysis

### Best Practices

1. ✅ **Always use package-lock.json** - Locks all dependency versions
2. ✅ **Regular dependency audits** - Use `npm audit` regularly
3. ✅ **Pin dependency versions** - Use exact versions in production
4. ✅ **Monitor dependency tree** - Regular scans for changes
5. ✅ **Review transitive deps** - Understand your full dependency tree
6. ✅ **Use SBOMs** - Maintain Software Bill of Materials
7. ✅ **Automated scanning** - Include in CI/CD pipeline

## 🔍 Real-World Impact

### Statistics

- **Average npm project**: 80+ transitive dependencies
- **Typical dependency depth**: 3-5 levels deep
- **Most projects**: Don't audit transitive dependencies
- **Attack success rate**: High due to lack of visibility

### Case Studies

1. **event-stream (2018)**: 2M weekly downloads, weeks undetected
2. **coa & rc (2021)**: Affected React, Vue, Angular
3. **Multiple packages (2021)**: Credential theft through transitive deps

## 🎓 Advanced Exercises

### Exercise 1: Deep Dependency Analysis
- Map the complete dependency tree
- Identify all transitive dependencies
- Calculate dependency depth
- Find packages with postinstall scripts

### Exercise 2: Automated Detection
- Create a CI/CD pipeline check
- Automate dependency tree scanning
- Set up alerts for suspicious packages
- Implement SBOM generation

### Exercise 3: Defense Implementation
- Implement dependency pinning
- Set up automated scanning
- Create monitoring dashboards
- Document incident response procedures

## 📚 Additional Resources

- [npm documentation on dependencies](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#dependencies)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [Snyk - Dependency Scanning](https://snyk.io/)
- [npm audit documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)

## ⚠️ Safety & Ethics

**IMPORTANT**: This scenario is for **educational purposes only**.

- ✅ Use ONLY in isolated test environments
- ✅ Never deploy malicious code to production
- ✅ All malicious code requires `TESTBENCH_MODE=enabled`
- ✅ Data exfiltration only goes to localhost

---

**Remember**: Transitive dependencies are a critical attack vector. Always audit your entire dependency tree, not just direct dependencies!

🔐 Happy Learning!

