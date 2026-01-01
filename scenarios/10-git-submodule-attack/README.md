# Scenario 10: Git Submodule Attack 🎯

## 🎓 Learning Objectives

By completing this scenario, you will learn:
- How git submodules work
- How attackers use malicious submodules to compromise repositories
- Techniques to detect malicious submodules
- Submodule validation and integrity checking
- Defense strategies for submodule security
- Real-world examples of submodule attacks

## 📖 Background

**Git Submodule Attack** occurs when an attacker adds a malicious git submodule to a legitimate repository. When developers clone the repository or update submodules, the malicious submodule executes code, potentially compromising their systems.

### Why This Attack is Dangerous

1. **Automatic Execution**: Submodules execute during clone/update
2. **Hidden from View**: Submodules can be overlooked in code reviews
3. **Wide Impact**: Affects all projects that include the repository
4. **Trust Chain**: Victims trust the parent repository
5. **Build Integration**: Submodules often execute during build processes

### Real-World Examples

- **Multiple repositories**: Malicious submodules added to popular projects
- **CI/CD compromises**: Submodules execute in build pipelines
- **Supply chain attacks**: Submodules used to inject malicious code

## 🎯 Scenario Description

**Scenario**: A legitimate repository `awesome-project` has been compromised. An attacker has added a malicious git submodule that executes malicious code when cloned or updated. Your task is to:

1. **Red Team**: Execute a submodule attack
2. **Blue Team**: Detect the malicious submodule
3. **Security Team**: Implement submodule validation and defenses

## 🔧 Setup

### Prerequisites
- Node.js 16+ and npm installed
- Git installed
- Basic understanding of git submodules

### Environment Setup

```bash
cd scenarios/10-git-submodule-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

## 📝 Lab Tasks

### Part 1: Understanding Git Submodules (15 minutes)

**Submodule Basics**:
- Submodules allow including other repositories
- Stored in `.gitmodules` file
- Executed during clone/update operations
- Can contain malicious code

**Your Tasks**:
- Examine the legitimate repository
- Understand `.gitmodules` structure
- Review submodule configuration

```bash
cd legitimate-repo
cat .gitmodules
git submodule status
```

### Part 2: The Attack - Malicious Submodule (25 minutes)

**Attack Scenario**: Attacker has added a malicious submodule to the repository.

```bash
cd compromised-repo
cat .gitmodules
cat malicious-submodule/postinstall.sh
```

**What Happens**:
1. Attacker adds malicious submodule to repository
2. Submodule contains malicious scripts
3. When developers clone/update, submodule executes
4. Malicious code runs during clone or build
5. System compromise occurs

### Part 3: Detection Methods (30 minutes)

**Detection Techniques**:
- Review `.gitmodules` file
- Check submodule URLs and paths
- Validate submodule integrity
- Monitor submodule execution
- Analyze submodule content

See detection tools and README for detailed detection methods.

### Part 4: Incident Response (25 minutes)

**Response Steps**:
1. Remove malicious submodule
2. Update `.gitmodules` file
3. Clean submodule cache
4. Verify repository integrity
5. Notify affected users

## 🛡️ Defense Strategies

### Prevention

1. **Submodule Review**: Review all submodule additions
2. **URL Validation**: Verify submodule repository URLs
3. **Access Controls**: Limit who can add submodules
4. **Submodule Pinning**: Pin submodules to specific commits
5. **Automated Scanning**: Scan for suspicious submodules

### Detection

1. **`.gitmodules` Review**: Regular review of submodule configuration
2. **URL Verification**: Verify submodule repository URLs are legitimate
3. **Content Analysis**: Analyze submodule content for malicious code
4. **Execution Monitoring**: Monitor submodule execution
5. **Integrity Checking**: Verify submodule integrity

### Response

1. **Immediate Removal**: Remove malicious submodule immediately
2. **Repository Cleanup**: Clean submodule cache and references
3. **User Notification**: Notify users of the compromise
4. **Access Review**: Review who added the submodule
5. **Incident Documentation**: Document the attack and response

## 📊 Key Takeaways

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
4. ✅ **Monitor submodule execution** - Watch for unexpected execution
5. ✅ **Use submodule validation** - Implement automated validation
6. ✅ **Limit access** - Control who can add submodules
7. ✅ **Regular audits** - Regularly audit submodule configurations

## 🔍 Real-World Impact

- **Repository compromises**: Multiple repositories compromised via submodules
- **CI/CD attacks**: Submodules execute in build pipelines
- **Detection time**: Often days or weeks before discovery

## ⚠️ Safety & Ethics

**IMPORTANT**: This scenario is for **educational purposes only**.

- ✅ Use ONLY in isolated test environments
- ✅ Never deploy malicious code to production
- ✅ All malicious code requires `TESTBENCH_MODE=enabled`
- ✅ Submodules are simulated for educational purposes

---

**Remember**: Git submodules can execute code automatically. Always review submodule additions carefully and validate submodule repositories!

🔐 Happy Learning!

