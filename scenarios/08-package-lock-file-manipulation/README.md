# Scenario 8: Package Lock File Manipulation Attack 🎯

## 🎓 Learning Objectives

By completing this scenario, you will learn:
- How package-lock.json manipulation attacks work
- Why lock files are trusted by package managers
- How to detect lock file tampering
- Techniques to validate lock file integrity
- Defense strategies for lock file manipulation
- CI/CD pipeline security implications

## 📖 Background

**Package Lock File Manipulation** occurs when an attacker modifies `package-lock.json` (or `yarn.lock`, `pnpm-lock.yaml`) to inject malicious packages. When developers or CI/CD systems run `npm install` or `npm ci`, they install packages based on the lock file, even if those packages aren't in `package.json`.

### Why This Attack is Dangerous

1. **Trust in Lock Files**: Package managers trust lock files completely
2. **CI/CD Vulnerability**: `npm ci` uses lock file exclusively, ignoring package.json
3. **Hidden from View**: package.json appears clean and legitimate
4. **Persistent Attack**: Lock file changes persist through commits
5. **Bypasses Reviews**: Security reviews often focus on package.json, not lock files

### Real-World Attack Vectors

1. **Compromised Git Repository**: Attacker commits manipulated lock file
2. **Malicious Pull Request**: PR includes lock file with malicious packages
3. **CI/CD Compromise**: Attacker modifies lock file in CI/CD artifacts
4. **Developer Machine Compromise**: Attacker modifies local lock file

### Real-World Examples

- **Multiple npm packages (2021)**: Lock files manipulated to inject credential stealers
- **CI/CD pipeline attacks**: Lock files modified in build systems
- **Git repository compromises**: Lock files committed with malicious packages

## 🎯 Scenario Description

**Scenario**: You have a legitimate application with a clean `package.json` containing only `express` and `lodash`. However, an attacker has manipulated the `package-lock.json` to include a malicious package `evil-utils`. Your task is to:

1. **Red Team**: Execute a lock file manipulation attack
2. **Blue Team**: Detect the lock file tampering
3. **Security Team**: Implement defenses and validation

## 🔧 Setup

### Prerequisites
- Node.js 16+ and npm installed
- Basic understanding of npm and lock files

### Environment Setup

```bash
cd scenarios/08-package-lock-file-manipulation
export TESTBENCH_MODE=enabled
./setup.sh
```

## 📝 Lab Tasks

### Part 1: Understanding Lock Files (15 minutes)

**Lock File Purpose**:
- Locks exact versions of all dependencies
- Ensures reproducible installs
- Includes transitive dependencies
- Used by `npm ci` for clean installs

**Your Tasks**:
- Examine the legitimate app at `./legitimate-app/`
- Review the victim app at `./victim-app/` (with packages installed)
- Review the compromised app at `./compromised-app/` (pre-manipulated, ready to demonstrate)
- Compare their `package.json` files
- Compare their `package-lock.json` files

```bash
# View legitimate app (clean)
cd legitimate-app
cat package.json
cat package-lock.json | head -50

# View victim app (manipulated, packages installed)
cd ../victim-app
cat package.json
cat package-lock.json | grep -A 10 "evil-utils"

# View compromised app (pre-manipulated, ready to demonstrate)
cd ../compromised-app
cat package.json
cat package-lock.json | grep -A 10 "evil-utils"
```

**Questions**:
- Are the package.json files the same?
- What's different in the package-lock.json files?
- Why would npm install the malicious package?

### Part 2: The Attack (20 minutes)

**Attacker Perspective**: How does the attack work?

1. **Examine the Manipulation**:
   ```bash
   cd victim-app
   
   # Check package.json (should be clean)
   cat package.json
   
   # Check package-lock.json (should contain evil-utils)
   cat package-lock.json | grep -B 5 -A 10 "evil-utils"
   ```

2. **Start the Mock Attacker Server**:
   ```bash
   # In a separate terminal
   node infrastructure/mock-server.js
   ```

3. **Install from Manipulated Lock File**:
   ```bash
   cd victim-app
   
   # Clean install to simulate fresh CI/CD environment
   rm -rf node_modules
   
   # Install from lock file (this installs evil-utils!)
   npm install
   # OR use npm ci (which ONLY uses lock file)
   # npm ci
   ```

4. **Observe the Attack**:
   - The postinstall script executes automatically
   - Data is exfiltrated to the attacker server
   - Check the mock server console for captured data

**What Happens**:
- `package.json` is clean (only express and lodash)
- `package-lock.json` contains `evil-utils` entry
- `npm install` or `npm ci` installs `evil-utils` based on lock file
- Malicious postinstall script executes
- System information and sensitive files are collected
- Data is exfiltrated to attacker server
- Application continues to work normally

### Part 3: Detection Methods (25 minutes)

**Your Task**: Detect the lock file manipulation

#### Detection Method 1: Lock File Validation

```bash
# Use the lock file validator
node detection-tools/lock-file-validator.js victim-app
```

**What to Look For**:
- Packages in lock file but not in package.json
- Unexpected packages with postinstall scripts
- Suspicious package names
- Integrity hash mismatches

#### Detection Method 2: Manual Comparison

```bash
cd victim-app

# Compare package.json and package-lock.json
echo "=== package.json dependencies ==="
cat package.json | grep -A 10 '"dependencies"'

echo ""
echo "=== package-lock.json packages ==="
cat package-lock.json | grep -o '"[^"]*":\s*{' | head -20

# Find packages in lock file but not in package.json
node -e "
const pkg = require('./package.json');
const lock = require('./package-lock.json');
const pkgDeps = Object.keys({...pkg.dependencies, ...pkg.devDependencies});
const lockDeps = Object.keys(lock.dependencies || {});
const unexpected = lockDeps.filter(d => !pkgDeps.includes(d));
console.log('Unexpected packages:', unexpected);
"
```

#### Detection Method 3: Git Diff Analysis

```bash
cd victim-app

# Check git history for lock file changes
git log -p package-lock.json | head -100

# Check for suspicious additions
git diff HEAD~1 package-lock.json | grep -A 10 "evil-utils"
```

#### Detection Method 4: Package Verification

```bash
cd victim-app

# Check installed packages
npm list --depth=0

# Check for packages not in package.json
npm list --depth=0 | grep -v "express\|lodash"

# Verify package integrity
npm audit
```

#### Detection Method 5: Runtime Detection

```bash
# Check if malicious package is loaded
cd victim-app
node -e "try { require('evil-utils'); console.log('⚠️  evil-utils is installed!'); } catch(e) { console.log('✅ evil-utils not found'); }"

# Check captured data
curl http://localhost:3000/captured-data
```

**Detection Checklist**:
- [ ] Compare package.json with package-lock.json
- [ ] Identify packages in lock file but not in package.json
- [ ] Check for suspicious package names
- [ ] Verify package integrity hashes
- [ ] Review git history for lock file changes
- [ ] Use automated validation tools

### Part 4: Investigation & Forensics (20 minutes)

**The Attack Has Been Detected. Investigate!**

#### Investigation Step 1: Lock File Analysis

```bash
cd victim-app

# Extract all packages from lock file
node -e "
const lock = require('./package-lock.json');
const packages = Object.keys(lock.dependencies || {});
console.log('Packages in lock file:');
packages.forEach(pkg => {
  const info = lock.dependencies[pkg];
  console.log(\`  - \${pkg}@\${info.version}\`);
});
"

# Check for evil-utils specifically
cat package-lock.json | jq '.dependencies["evil-utils"]'
```

#### Investigation Step 2: Package.json Comparison

```bash
# Compare what should be installed vs what is installed
echo "=== Expected (package.json) ==="
cat package.json | jq '.dependencies'

echo ""
echo "=== Actual (package-lock.json) ==="
cat package-lock.json | jq '.dependencies | keys'
```

#### Investigation Step 3: Git History Analysis

```bash
# Check when lock file was modified
git log --oneline package-lock.json

# See the exact changes
git show HEAD:package-lock.json | grep -A 10 "evil-utils" || echo "Not in current version"

# Check commit author and message
git log -1 --format="%an - %s" package-lock.json
```

#### Investigation Step 4: Impact Assessment

```bash
# Check what data was exfiltrated
cat infrastructure/captured-data.json | jq '.captures[0].data'

# Identify affected systems
cat infrastructure/captured-data.json | jq '.captures[].data.hostname'
```

**Build Timeline**:
- When was the lock file manipulated?
- Who committed the change?
- What data was exfiltrated?
- How long was the compromise active?

### Part 5: Incident Response & Mitigation (30 minutes)

**The Attack Has Been Confirmed. Respond!**

#### Response Step 1: Immediate Containment

```bash
cd victim-app

# 1. Remove malicious package
npm uninstall evil-utils

# 2. Remove node_modules
rm -rf node_modules

# 3. Regenerate lock file from package.json
rm package-lock.json
npm install

# 4. Verify new lock file is clean
node ../detection-tools/lock-file-validator.js .
```

#### Response Step 2: Lock File Restoration

```bash
# 1. Restore from git (if available)
git checkout HEAD -- package-lock.json

# 2. OR regenerate from package.json
rm package-lock.json
npm install

# 3. Verify integrity
npm audit
node ../detection-tools/lock-file-validator.js .
```

#### Response Step 3: CI/CD Security

**Update CI/CD Pipeline**:

```yaml
# .github/workflows/ci.yml
- name: Validate lock file
  run: |
    node scripts/validate-lock-file.js
    npm audit
    npm ci --dry-run

- name: Install dependencies
  run: npm ci
```

#### Response Step 4: Long-term Defenses

**Implement Multiple Layers**:

1. **Lock File Validation in CI/CD**:
   ```bash
   # Add to CI/CD pipeline
   node detection-tools/lock-file-validator.js .
   ```

2. **Git Hooks**:
   ```bash
   # .git/hooks/pre-commit
   #!/bin/bash
   node detection-tools/lock-file-validator.js .
   if [ $? -ne 0 ]; then
     echo "Lock file validation failed!"
     exit 1
   fi
   ```

3. **Package.json Verification**:
   ```bash
   # Verify all packages in lock file are in package.json
   node -e "
   const pkg = require('./package.json');
   const lock = require('./package-lock.json');
   const pkgDeps = Object.keys({...pkg.dependencies, ...pkg.devDependencies});
   const lockDeps = Object.keys(lock.dependencies || {});
   const unexpected = lockDeps.filter(d => !pkgDeps.includes(d) && !d.startsWith('@types/'));
   if (unexpected.length > 0) {
     console.error('Unexpected packages:', unexpected);
     process.exit(1);
   }
   "
   ```

4. **Lock File Checksums**:
   ```bash
   # Generate checksum of lock file
   sha256sum package-lock.json > package-lock.json.sha256
   
   # Verify in CI/CD
   sha256sum -c package-lock.json.sha256
   ```

5. **Automated Scanning**:
   - Regular lock file validation
   - Git diff analysis for lock file changes
   - Package integrity verification
   - Automated alerts for suspicious packages

## 🛡️ Defense Strategies

### Prevention

1. **Lock File Validation**: Always validate lock files before install
2. **Git Hooks**: Pre-commit hooks to validate lock files
3. **CI/CD Checks**: Automated validation in pipelines
4. **Code Reviews**: Review lock file changes carefully
5. **Checksums**: Store and verify lock file checksums

### Detection

1. **Automated Validation**: Regular lock file validation
2. **Package Comparison**: Compare package.json with lock file
3. **Git History Review**: Review lock file changes in commits
4. **Integrity Checks**: Verify package integrity hashes
5. **Unexpected Package Detection**: Alert on packages not in package.json

### Response

1. **Immediate Removal**: Remove malicious packages
2. **Lock File Restoration**: Restore from git or regenerate
3. **Impact Assessment**: Determine scope of compromise
4. **Credential Rotation**: Rotate potentially compromised credentials
5. **Incident Documentation**: Document the attack and response

## 📊 Key Takeaways

### Why Lock Files Are Risky

1. **Complete Trust**: Package managers trust lock files completely
2. **CI/CD Dependency**: `npm ci` uses lock file exclusively
3. **Hidden Manipulation**: package.json appears clean
4. **Persistent Attack**: Changes persist through commits
5. **Review Bypass**: Often overlooked in security reviews

### Best Practices

1. ✅ **Always validate lock files** - Use automated tools
2. ✅ **Review lock file changes** - In git commits and PRs
3. ✅ **Use git hooks** - Pre-commit validation
4. ✅ **CI/CD validation** - Automated checks in pipelines
5. ✅ **Compare with package.json** - Ensure consistency
6. ✅ **Store checksums** - Verify lock file integrity
7. ✅ **Monitor for unexpected packages** - Automated alerts

## 🔍 Real-World Impact

### Statistics

- **CI/CD attacks**: Lock file manipulation in 15% of supply chain attacks
- **Detection time**: Average 30+ days to detect
- **Impact**: High - affects entire development team and CI/CD

### Case Studies

1. **Multiple npm packages (2021)**: Lock files manipulated to inject credential stealers
2. **CI/CD pipeline attacks**: Lock files modified in build systems
3. **Git repository compromises**: Lock files committed with malicious packages

## 🎓 Advanced Exercises

### Exercise 1: Automated Detection
- Create a CI/CD pipeline check
- Set up git hooks for validation
- Implement automated alerts
- Create monitoring dashboard

### Exercise 2: Defense Implementation
- Implement lock file validation
- Set up git hooks
- Create CI/CD checks
- Document incident response procedures

### Exercise 3: Advanced Analysis
- Analyze git history for lock file changes
- Create lock file diff tool
- Implement package integrity verification
- Build automated scanning system

## 📚 Additional Resources

- [npm package-lock.json documentation](https://docs.npmjs.com/cli/v8/configuring-npm/package-lock-json)
- [npm ci documentation](https://docs.npmjs.com/cli/v8/commands/npm-ci)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [Snyk - Lock File Security](https://snyk.io/)

## ⚠️ Safety & Ethics

**IMPORTANT**: This scenario is for **educational purposes only**.

- ✅ Use ONLY in isolated test environments
- ✅ Never deploy malicious code to production
- ✅ All malicious code requires `TESTBENCH_MODE=enabled`
- ✅ Data exfiltration only goes to localhost

---

**Remember**: Lock files are trusted completely by package managers. Always validate lock files and review changes carefully!

🔐 Happy Learning!

