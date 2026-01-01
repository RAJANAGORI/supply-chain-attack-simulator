# 🚀 Zero to Hero: Scenario 10 - Git Submodule Attack

Welcome! This guide will take you from zero knowledge to successfully completing the Git Submodule Attack scenario.

## 📚 What You'll Learn

By the end of this guide, you will:
- Understand how git submodules work
- Learn how attackers use malicious submodules
- Execute a submodule attack simulation (safely)
- Conduct submodule validation and forensic investigation
- Perform incident response
- Implement defense strategies

---

## Part 1: Understanding Git Submodules (15 minutes)

### What are Git Submodules?

**Git submodules** allow you to include other git repositories as subdirectories within your repository. They're useful for including external code, but can also be used maliciously.

**How submodules work:**
1. Main repository references another repository
2. Submodule information stored in `.gitmodules` file
3. Submodule content stored in separate directory
4. Submodules can execute code during clone/update

### Why Submodules Can Be Dangerous

- **Automatic Execution**: Code in submodules can execute during clone/update
- **Hidden from View**: Submodules can be overlooked in code reviews
- **Wide Impact**: Affects all repository users
- **Trust Chain**: Users trust the parent repository
- **Build Integration**: Submodules often execute in CI/CD pipelines

---

## Part 2: Prerequisites Check (5 minutes)

Before we start, make sure you have:

- ✅ Git installed
- ✅ Node.js 16+ installed
- ✅ Basic understanding of git
- ✅ TESTBENCH_MODE enabled

Verify your setup:

```bash
git --version
node --version
echo $TESTBENCH_MODE  # Should output: enabled
```

---

## Part 3: Setting Up Scenario 10 (15 minutes)

### Step 1: Navigate to Scenario Directory

```bash
cd scenarios/10-git-submodule-attack
```

### Step 2: Run the Setup Script

```bash
export TESTBENCH_MODE=enabled
./setup.sh
```

**What this does:**
- Creates directory structure
- Sets up legitimate repository
- Creates compromised repository with malicious submodule
- Sets up detection tools
- Creates mock attacker server

---

## Part 4: Understanding the Legitimate Repository (20 minutes)

### Step 1: Examine the Legitimate Repository

```bash
cd legitimate-repo
cat .gitmodules
```

**What you'll see:**
```
[submodule "legitimate-lib"]
	path = libs/legitimate-lib
	url = https://github.com/legitproject/legitimate-lib.git
```

**Key Components:**
- `[submodule "name"]`: Submodule section
- `path`: Where submodule is stored
- `url`: Repository URL for submodule

### Step 2: Understand Submodule Structure

`.gitmodules` file defines:
- Submodule names
- Local paths
- Repository URLs

---

## Part 5: The Attack - Malicious Submodule (30 minutes)

### Step 1: Understand the Attack

**Scenario**: Attacker has added a malicious submodule to the repository.

**Attack Steps:**
1. Attacker adds malicious submodule to repository
2. Submodule contains malicious scripts
3. `.gitmodules` file updated to include submodule
4. When developers clone/update, submodule executes
5. Malicious code runs automatically

### Step 2: Examine the Compromised Repository

```bash
cd ../compromised-repo
cat .gitmodules
```

**What you'll see:**
```
[submodule "legitimate-lib"]
	path = libs/legitimate-lib
	url = https://github.com/legitproject/legitimate-lib.git

[submodule "malicious-submodule"]
	path = libs/malicious-submodule
	url = ./malicious-submodule
```

**Key Difference**: New submodule added!

### Step 3: Examine the Malicious Submodule

```bash
cd ../malicious-submodule
cat postinstall.sh
```

**What it does:**
- Executes automatically when submodule is initialized
- Collects system information
- Exfiltrates data to attacker server

### Step 4: Start the Mock Attacker Server

```bash
cd ../infrastructure
node mock-server.js &
```

### Step 5: Simulate the Attack

```bash
cd ../malicious-submodule
export TESTBENCH_MODE=enabled
bash postinstall.sh
```

**What happens:**
1. Submodule postinstall script executes
2. System information collected
3. Data exfiltrated to attacker server
4. Check mock server console for captured data!

---

## Part 6: Detection Methods (40 minutes)

### Detection Method 1: Submodule Validation

```bash
cd detection-tools
node submodule-validator.js ../compromised-repo
```

**What to look for:**
- Unexpected submodules in `.gitmodules`
- Suspicious submodule URLs
- Local/relative URLs (suspicious)
- Submodules with postinstall scripts

### Detection Method 2: Manual .gitmodules Review

```bash
cd ../compromised-repo
cat .gitmodules
```

**Red Flags:**
- Unexpected submodules
- Local/relative URLs (`./`, `../`)
- Suspicious submodule names
- Submodules you didn't add

### Detection Method 3: Git History Analysis

```bash
# Check when .gitmodules was modified
git log -p .gitmodules
```

**What to look for:**
- Unexpected `.gitmodules` changes
- Unknown commit authors
- Suspicious commit messages
- Submodules added without review

---

## Part 7: Forensic Investigation (30 minutes)

### Investigation Step 1: Submodule Analysis

```bash
cd compromised-repo
cat .gitmodules | grep -A 2 "malicious"
```

**Findings:**
- Malicious submodule in `.gitmodules`
- Local/relative URL (suspicious)
- Path points to local directory

### Investigation Step 2: Content Analysis

```bash
cat ../malicious-submodule/postinstall.sh
```

**Findings:**
- Script contains data exfiltration
- Collects system information
- Sends data to attacker server

---

## Part 8: Incident Response (30 minutes)

### Response Step 1: Immediate Containment

```bash
cd compromised-repo

# Remove malicious submodule from .gitmodules
# Edit .gitmodules and remove the [submodule "malicious-submodule"] section

# Remove submodule directory
rm -rf libs/malicious-submodule

# Clean git cache
git rm --cached libs/malicious-submodule
```

### Response Step 2: Repository Cleanup

```bash
# Update .gitmodules (remove malicious submodule section)
# Commit changes
git add .gitmodules
git commit -m "Remove malicious submodule"
```

### Response Step 3: Notify Users

**Actions:**
1. Notify repository users
2. Provide cleanup instructions
3. Review access controls
4. Implement submodule validation

---

## Part 9: Defense Strategies (20 minutes)

### Prevention

1. **Submodule Review**: Review all submodule additions
2. **URL Validation**: Verify submodule repository URLs
3. **Access Controls**: Limit who can add submodules
4. **Submodule Pinning**: Pin submodules to specific commits
5. **Automated Scanning**: Scan for suspicious submodules

### Detection

1. **`.gitmodules` Review**: Regular review of submodule configuration
2. **URL Verification**: Verify submodule URLs are legitimate
3. **Content Analysis**: Analyze submodule content
4. **Execution Monitoring**: Monitor submodule execution
5. **Git History Review**: Review `.gitmodules` changes in commits

### Response

1. **Immediate Removal**: Remove malicious submodule
2. **Repository Cleanup**: Clean submodule cache and references
3. **User Notification**: Notify users of compromise
4. **Access Review**: Review who added the submodule
5. **Incident Documentation**: Document attack and response

---

## Part 10: Key Takeaways (10 minutes)

### Why Submodule Attacks Are Dangerous

1. **Automatic Execution**: Execute during clone/update
2. **Hidden**: Can be overlooked in reviews
3. **Wide Impact**: Affect all repository users
4. **Trust Chain**: Users trust parent repository
5. **Build Integration**: Execute in CI/CD pipelines

### Best Practices

1. ✅ **Review submodule additions** - Carefully review all `.gitmodules` changes
2. ✅ **Verify submodule URLs** - Ensure URLs point to legitimate repositories
3. ✅ **Pin submodules** - Pin to specific commits, not branches
4. ✅ **Monitor execution** - Watch for unexpected execution
5. ✅ **Use validation** - Implement automated submodule validation
6. ✅ **Limit access** - Control who can add submodules
7. ✅ **Regular audits** - Regularly audit submodule configurations

---

## 🎓 Congratulations!

You've successfully completed Scenario 10: Git Submodule Attack!

**What you've learned:**
- ✅ How git submodules work
- ✅ How attackers use malicious submodules
- ✅ Detection and investigation techniques
- ✅ Incident response procedures
- ✅ Defense strategies

---

## 📚 Additional Resources

- [Git Submodules Documentation](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [Git Submodules Security](https://github.com/git/git/blob/master/Documentation/technical/index-format.txt)
- [OWASP Git Security](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)

🔐 Happy Learning!

