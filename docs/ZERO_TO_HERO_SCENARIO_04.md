# 🚀 Zero to Hero: Scenario 4 - Malicious Update Attack

> **Note**: This scenario is currently under development. This guide will be updated once the scenario is fully implemented.

## 📚 What You'll Learn

By the end of this guide, you will:
- Understand malicious update attacks
- Learn how trojan updates work
- Execute a malicious update simulation (safely)
- Detect and prevent malicious updates
- Implement update verification strategies

---

## Part 1: Understanding Malicious Updates (10 minutes)

### What is a Malicious Update?

**Malicious Update** attacks occur when attackers inject malicious code into what appears to be a legitimate package update. These updates often:
- Appear as normal bug fixes or feature additions
- Maintain backward compatibility
- Include legitimate functionality
- Hide malicious code in seemingly innocent changes

### Why It's Dangerous

- **Trusted Source**: Update comes from the same trusted maintainer
- **Automatic Updates**: Many projects use `^` or `~` version ranges
- **Wide Distribution**: Affects all users who update
- **Stealth**: Malicious code hidden in legitimate changes

### Real-World Examples

**coa & rc (2021)**:
- Maintainer account compromised
- Password stealer injected in updates
- Affected React, Vue, Angular projects

**ua-parser-js (2021)**:
- Versions 0.7.29, 0.8.0, 1.0.0 contained crypto miners
- Used in Facebook, Apple, Amazon, Microsoft products

---

## Part 2: Prerequisites Check (5 minutes)

Before we start, make sure you've completed:

- ✅ Scenario 1 (Typosquatting)
- ✅ Scenario 2 (Dependency Confusion)
- ✅ Scenario 3 (Compromised Package)
- ✅ Node.js 16+ and npm installed
- ✅ TESTBENCH_MODE enabled

---

## Part 3: Setting Up Scenario 4 (Coming Soon)

This scenario will cover:
- Creating malicious updates
- Understanding version ranges
- Detecting suspicious updates
- Implementing update verification

---

## Part 3: Setting Up Scenario 4 (15 minutes)

### Step 1: Navigate to Scenario Directory

```bash
cd scenarios/04-malicious-update
```

### Step 2: Run the Setup Script

```bash
./setup.sh
```

**What this does:**
- Creates directory structure
- Sets up legitimate package (version 2.1.0)
- Sets up malicious update (version 2.1.1)
- Creates victim application
- Sets up detection tools

**Expected output:**
- Setup progress messages
- Directories and files created
- "Next Steps" displayed

### Step 3: Understand the Environment

**The Package**: `utils-helper`
- **Legitimate Version**: 2.1.0 (in `legitimate-package/`)
- **Malicious Update**: 2.1.1 (in `malicious-update/`)
- **Purpose**: Utility functions for common operations
- **Weekly Downloads**: 8,000,000+
- **Maintainer**: Sarah Johnson (compromised account)

**The Attack**: 
- Attacker obtained maintainer credentials
- Published malicious update version 2.1.1
- Update includes legitimate bug fixes + hidden malicious code
- Users with `^2.1.0` automatically get the malicious update

---

## Part 4: Understanding Automatic Updates (15 minutes)

### Step 1: Version Ranges Explained

npm uses semantic versioning (semver) with version ranges:

- `^2.1.0` - Allows updates to any version < 3.0.0 (2.1.1, 2.2.0, 2.9.9, but not 3.0.0)
- `~2.1.0` - Allows updates to any version < 2.2.0 (2.1.1, 2.1.9, but not 2.2.0)
- `*` or `latest` - Allows any version
- `2.1.0` - Exact version only (no automatic updates)

### Step 2: The Vulnerability

When developers use version ranges:
```json
{
  "dependencies": {
    "utils-helper": "^2.1.0"
  }
}
```

Running `npm install` or `npm update` will automatically install version 2.1.1 if it's available, even if it's malicious!

### Step 3: Examine the Victim Application

```bash
cd victim-app
cat package.json
```

**Notice**: Uses `^2.1.0`, which allows automatic updates to 2.1.1.

---

## Part 5: Executing the Attack (30 minutes)

### Step 1: Install Legitimate Version

```bash
cd victim-app

# Install the legitimate version
npm install ../legitimate-package/utils-helper

# Verify version
npm list utils-helper
# Should show: utils-helper@2.1.0
```

### Step 2: Start Mock Attacker Server

```bash
# Start mock server (if not already running)
node ../01-typosquatting/infrastructure/mock-server.js &
```

**Verify it's running:**
```bash
curl http://localhost:3000/captured-data
```

### Step 3: Simulate Automatic Update

```bash
# Clear and reinstall (simulates npm update)
rm -rf node_modules package-lock.json
npm install

# npm will check for updates and find 2.1.1
# Since ^2.1.0 allows 2.1.1, it installs automatically
```

**Or explicitly update:**
```bash
npm update utils-helper
```

### Step 4: Verify the Update

```bash
# Check installed version
npm list utils-helper
# Should show: utils-helper@2.1.1 (malicious version)

# Run the application
export TESTBENCH_MODE=enabled
npm start
```

**What happens:**
- Application runs normally
- Malicious code executes in background
- Data is exfiltrated silently

### Step 5: Check Exfiltrated Data

```bash
# Check captured data
curl http://localhost:3000/captured-data
```

**What you should see:**
- Version: 2.1.1 (malicious update)
- Captured data in mock server
- Attack successful!

---

## Part 6: Understanding What Happened (10 minutes)

### The Attack Flow

1. **Initial State**: Application uses `utils-helper@2.1.0`
2. **Attacker Action**: Publishes malicious update `2.1.1`
3. **Automatic Update**: Developer runs `npm update`
4. **Version Resolution**: npm sees 2.1.1 is within `^2.1.0` range
5. **Automatic Installation**: Malicious version installed
6. **Execution**: Malicious code runs when package is imported
7. **Data Exfiltration**: Sensitive data sent to attacker

### Why It Worked

- **Version Range**: `^2.1.0` allows automatic updates
- **Trust**: Update comes from same trusted maintainer
- **Stealth**: Update includes legitimate bug fixes
- **No Review**: Developers often don't review patch updates

---

## Part 7: Detecting the Attack (25 minutes)

Now let's switch roles and become defenders. How can we detect this malicious update?

### Method 1: Version Comparison

```bash
# Compare package versions
diff -ur legitimate-package/utils-helper malicious-update/utils-helper

# Check what changed
cat malicious-update/utils-helper/index.js | head -50
```

### Method 2: Code Review

```bash
# Review the update
cat malicious-update/utils-helper/index.js

# Look for suspicious patterns
grep -n "http\|https\|process.env\|eval" malicious-update/utils-helper/index.js
```

### Method 3: Automated Scanning

```bash
cd detection-tools
node update-scanner.js ../victim-app
```

**What it checks:**
- Version ranges that allow automatic updates
- Suspicious code patterns
- Unexpected changes

### Method 4: Behavioral Analysis

```bash
# Monitor during update
npm update utils-helper --verbose

# Check network traffic
../detection-tools/network-monitor.sh
```

---

## Part 8: Prevention and Mitigation (30 minutes)

Now that we've seen how the attack works, how can we prevent it?

### Prevention Strategy 1: Pin Exact Versions

```json
{
  "dependencies": {
    "utils-helper": "2.1.0"  // Exact version, not ^2.1.0
  }
}
```

**Benefits:**
- No automatic updates
- Full control over versions
- Predictable builds

### Prevention Strategy 2: Use Package Lock Files

```bash
# Always commit package-lock.json
git add package-lock.json
git commit -m "Lock dependencies"

# In CI/CD, use npm ci (not npm install)
npm ci
```

**Benefits:**
- Locks exact versions
- Prevents automatic updates
- Provides integrity checking

### Prevention Strategy 3: Update Verification

Create a pre-update verification script:

```bash
# Before updating, verify the update
npm view utils-helper@2.1.1
# Review changelog, check for suspicious changes
```

### Prevention Strategy 4: Staged Rollouts

```bash
# Test updates in staging first
npm install utils-helper@2.1.1 --save-exact
npm test
# If tests pass, then deploy
```

### Prevention Strategy 5: Changelog Review

Always review changelogs before updating:
- Check what changed
- Verify changes match the version bump
- Look for suspicious additions

### Prevention Strategy 6: Automated Update Scanning

```yaml
# .github/workflows/security.yml
- name: Scan Updates
  run: |
    npm update --dry-run
    node scripts/scan-updates.js
```

---

## Part 9: Clean Up and Next Steps (5 minutes)

### Clean Up

```bash
# Stop mock server (if running manually)
# ps aux | grep mock-server
# kill <PID>
```

### What You've Accomplished

✅ Understood malicious update attacks  
✅ Executed a malicious update simulation (safely)  
✅ Detected malicious updates using multiple methods  
✅ Implemented preventive measures  

### Next Steps

1. **Try Scenario 5**: Build System Compromise
2. **Experiment**: Try different version ranges
3. **Read more**: Study real-world update attacks
4. **Practice**: Implement update verification in a real project

---

## 📚 Additional Resources

- **Main README**: `README.md`
- **Other Scenarios**: See `docs/ZERO_TO_HERO_SCENARIO_01.md`, etc.
- **Best Practices**: `docs/BEST_PRACTICES.md`

---

## ⚠️ Important Reminders

- ✅ This is for **EDUCATIONAL purposes only**
- ✅ Use **ONLY in isolated environments**
- ✅ **Never** deploy malicious code to production
- ✅ **Always** set `TESTBENCH_MODE=enabled`

---

Happy learning! 🔐

