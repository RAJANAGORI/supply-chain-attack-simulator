# Scenario 4: Malicious Update Attack 🎯

## 🎓 Learning Objectives

By completing this scenario, you will learn:
- How malicious updates exploit automatic version updates
- Techniques attackers use to hide malicious code in updates
- How version ranges (^, ~) enable automatic updates
- Methods to detect suspicious package updates
- Strategies to verify and validate updates before installation

## 📖 Background

**Malicious Update** attacks occur when attackers inject malicious code into what appears to be a legitimate package update. These updates often:
- Appear as normal bug fixes or feature additions
- Maintain backward compatibility
- Include legitimate functionality
- Hide malicious code in seemingly innocent changes

### The Vulnerability

Many projects use version ranges in `package.json`:
- `^2.5.0` - Allows updates to any version < 3.0.0
- `~2.5.0` - Allows updates to any version < 2.6.0
- `*` or `latest` - Allows any version

When developers run `npm update` or `npm install`, these ranges automatically pull in the latest compatible version, which could be malicious.

### Real-World Examples:

- **coa & rc (2021)**: 
  - Maintainer account compromised
  - Password stealer injected in updates
  - Affected React, Vue, Angular projects
  
- **ua-parser-js (2021)**:
  - Versions 0.7.29, 0.8.0, 1.0.0 contained crypto miners
  - Used in Facebook, Apple, Amazon, Microsoft products

- **colors.js & faker.js (2022)**:
  - Maintainer deliberately sabotaged own packages
  - Infinite loop causing denial of service
  - Affected thousands of projects

## 🎯 Scenario Description

**Scenario**: A popular npm package `utils-helper` (8M weekly downloads) has been compromised. The attacker has:
1. Gained access to the maintainer's npm account
2. Published a malicious update (version 2.1.1) that appears to be a bug fix
3. The update includes legitimate fixes but also hidden malicious code

You will:
1. **Attacker Role**: Understand how malicious updates work
2. **Victim Role**: Experience automatic update installation
3. **Defender Role**: Detect and prevent malicious updates

## 🔧 Setup

```bash
cd scenarios/04-malicious-update
export TESTBENCH_MODE=enabled
./setup.sh
```

## 📝 Lab Tasks

### Part 1: Understanding the Legitimate Package (15 minutes)

Examine the original, legitimate package:

```bash
cd legitimate-package/utils-helper
cat package.json
cat index.js
```

**Package Details**:
- Name: `utils-helper`
- Version: 2.1.0
- Purpose: Utility functions for common operations
- Weekly Downloads: 8,000,000+
- Maintainer: Sarah Johnson (sarah@example.com)

**Your Tasks**:
- Understand the package functionality
- Review the codebase
- Note the version and features

### Part 2: The Attack - Malicious Update (25 minutes)

**Scenario**: Attacker has obtained the maintainer's npm credentials and published a malicious update.

#### Step 1: Examine the Malicious Update

```bash
cd ../../malicious-update/utils-helper
cat package.json
cat index.js
```

**Key Changes**:
1. **Version Bump**: 2.1.0 → 2.1.1 (patch version, seems safe)
2. **Legitimate Fixes**: Includes real bug fixes
3. **Hidden Malicious Code**: Malicious functionality hidden in the update
4. **Backward Compatible**: Doesn't break existing functionality

#### Step 2: Understand the Update Strategy

**Attacker's Approach**:
- Publish as patch version (2.1.1) - users expect patches to be safe
- Include legitimate bug fixes - appears normal
- Hide malicious code in new features or error handling
- Maintain backward compatibility - doesn't break existing code

#### Step 3: Review the Malicious Template

```bash
cat ../../templates/malicious-update-template.js
```

**Techniques Used**:
- Code hidden in new utility functions
- Malicious code in error handlers
- Conditional execution based on environment
- Obfuscated network requests

### Part 3: Simulating Automatic Updates (20 minutes)

#### Step 1: Set Up Victim Application

```bash
cd ../../victim-app
cat package.json
```

**Notice**: The package.json uses version range `^2.1.0`, which allows automatic updates to 2.1.1.

#### Step 2: Install Initial Version

```bash
# Install the legitimate version
npm install ../legitimate-package/utils-helper

# Verify version
npm list utils-helper
# Should show: utils-helper@2.1.0
```

#### Step 3: Simulate Automatic Update

```bash
# Clear and reinstall (simulates npm update)
rm -rf node_modules package-lock.json
npm install

# Or explicitly update
npm update utils-helper
```

**What happens**:
- npm checks for updates
- Finds version 2.1.1 (within ^2.1.0 range)
- Automatically installs the malicious update

#### Step 4: Verify the Update

```bash
# Check installed version
npm list utils-helper
# Should show: utils-helper@2.1.1 (malicious version)

# Run the application
export TESTBENCH_MODE=enabled
npm start
```

#### Step 5: Check Exfiltrated Data

```bash
# Start mock server if not running
node ../01-typosquatting/infrastructure/mock-server.js &

# Check captured data
curl http://localhost:3000/captured-data
```

### Part 4: Detection Methods (25 minutes)

**Your Task**: Detect the malicious update

#### Detection Method 1: Version Comparison

```bash
# Compare package versions
diff -ur legitimate-package/utils-helper malicious-update/utils-helper

# Check changelog (if available)
cat malicious-update/utils-helper/CHANGELOG.md
```

#### Detection Method 2: Code Review

```bash
# Review the update
cat malicious-update/utils-helper/index.js

# Look for suspicious patterns
grep -n "http\|https\|process.env\|eval" malicious-update/utils-helper/index.js
```

#### Detection Method 3: Automated Scanning

```bash
cd ../detection-tools
node update-scanner.js ../scenarios/04-malicious-update/victim-app
```

**What to Look For**:
- Unexpected code changes in patch versions
- New network requests
- Access to sensitive APIs
- Obfuscated code
- Suspicious dependencies

#### Detection Method 4: Behavioral Analysis

```bash
# Monitor during update
npm update utils-helper --verbose

# Check network traffic
../detection-tools/network-monitor.sh
```

### Part 5: Prevention & Mitigation (30 minutes)

Implement multiple layers of defense:

#### Prevention Strategy 1: Pin Exact Versions

```json
{
  "dependencies": {
    "utils-helper": "2.1.0"  // Exact version, not ^2.1.0
  }
}
```

#### Prevention Strategy 2: Use Package Lock Files

```bash
# Always commit package-lock.json
git add package-lock.json
git commit -m "Lock dependencies"

# In CI/CD, use npm ci (not npm install)
npm ci
```

#### Prevention Strategy 3: Update Verification

Create a pre-update verification script:

```bash
cat > scripts/verify-update.js << 'EOF'
#!/usr/bin/env node
// Verify updates before installation
const { execSync } = require('child_process');
const packageName = process.argv[2];
const newVersion = process.argv[3];

console.log(`Verifying update: ${packageName}@${newVersion}`);
// Check changelog, review code, verify integrity
EOF
```

#### Prevention Strategy 4: Automated Update Scanning

```yaml
# .github/workflows/security.yml
- name: Scan Updates
  run: |
    npm update --dry-run
    node scripts/scan-updates.js
```

#### Prevention Strategy 5: Staged Rollouts

```bash
# Test updates in staging first
npm install utils-helper@2.1.1 --save-exact
npm test
# If tests pass, then deploy
```

#### Prevention Strategy 6: Changelog Review

Always review changelogs before updating:
- Check what changed
- Verify changes match the version bump
- Look for suspicious additions

## ✅ Success Criteria

You've completed this scenario when you can:
- [ ] Understand how automatic updates work
- [ ] Successfully simulate a malicious update
- [ ] Detect malicious updates using multiple methods
- [ ] Implement at least 5 preventive measures
- [ ] Explain the update vulnerability to a colleague

## 🎁 Bonus Challenges

1. **Advanced Obfuscation**: Create more sophisticated hiding techniques
2. **Multi-Stage Updates**: Implement updates that activate over time
3. **Targeted Updates**: Make updates only affect specific organizations
4. **Version Range Exploitation**: Exploit different version range patterns
5. **Transitive Update Attacks**: Hide malicious code in dependency updates

## 📊 Attack Comparison

| Aspect | Typosquatting | Dependency Confusion | Compromised Package | Malicious Update |
|--------|---------------|---------------------|-------------------|------------------|
| Target | Public packages | Private packages | Trusted packages | Trusted packages |
| Mechanism | Human error | System config | Account takeover | Account takeover |
| Detection | Moderate | Difficult | Very Hard | Very Hard |
| Impact | Individual | Organization | Ecosystem | Ecosystem |
| Auto-Update | No | No | No | **Yes** |

## 🔍 Real-World Lessons

### Case Study: colors.js & faker.js (2022)

**What Happened**:
- Maintainer deliberately sabotaged own packages
- Published updates with infinite loops
- Affected thousands of projects
- Caused denial of service

**Lessons Learned**:
- Even trusted maintainers can be malicious
- Automatic updates can be dangerous
- Need to verify all updates, even from trusted sources
- Staged rollouts are essential

## 💡 Key Takeaways

- **Automatic updates are convenient but risky** - Always verify
- **Patch versions aren't always safe** - Review changes
- **Version ranges enable attacks** - Pin exact versions in production
- **Package lock files prevent updates** - Use them!
- **Staged rollouts catch issues** - Test before deploying
- **Changelog review is essential** - Know what changed

## 📚 Additional Resources

- [npm Version Ranges](https://docs.npmjs.com/cli/v7/using-npm/semver)
- [Package Lock Files](https://docs.npmjs.com/cli/v7/configuring-npm/package-lock-json)
- [Update Best Practices](https://docs.npmjs.com/cli/v7/commands/npm-update)

## 🔗 Related Scenarios

**Prerequisites**: Scenarios 1, 2, 3  
**Next**: Scenario 5 (Build Compromise)

---

**Next**: [Scenario 5: Build Compromise →](../05-build-compromise/README.md)

