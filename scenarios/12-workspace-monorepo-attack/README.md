# Scenario 12: Workspace/Monorepo Attack 🎯

## 🎓 Learning Objectives

By completing this scenario, you will learn:
- How npm workspaces and monorepos work
- How attackers compromise workspace packages to affect entire monorepos
- Why workspace dependencies are a critical attack vector
- Techniques to detect compromised workspace packages
- Defense strategies for workspace and monorepo security
- Real-world examples of workspace/monorepo compromises

## 📖 Background

**Workspace/Monorepo Attack** occurs when an attacker compromises a package within an npm workspace or monorepo. Since workspace packages share the same repository and can access each other's code, compromising one package can affect all packages in the workspace. This is especially dangerous in modern development where monorepos are common.

### Why This Attack is Dangerous

1. **Shared Access**: Workspace packages can access each other's code
2. **Wide Impact**: One compromised package affects all packages in the workspace
3. **Trust Chain**: Developers trust all packages in their workspace
4. **Hard to Detect**: Workspace packages are often treated as internal and trusted
5. **Automatic Execution**: Postinstall scripts in workspace packages execute automatically
6. **Modern Development**: Monorepos are increasingly common (Lerna, Nx, Turborepo, etc.)

### Real-World Examples

- **Monorepo Compromises**: Multiple organizations have had workspace packages compromised
- **Internal Package Attacks**: Attackers compromise internal workspace packages
- **Credential Theft**: Compromised workspace packages used to steal credentials
- **Backdoor Installation**: Malicious packages installed through workspace dependencies
- **Build System Attacks**: Workspace packages used to compromise CI/CD pipelines

## 🎯 Scenario Description

**Scenario**: You work at "DevCorp" which uses an npm workspace (monorepo) with multiple packages. The workspace includes `@devcorp/utils`, `@devcorp/api`, and `@devcorp/auth`. An attacker has compromised `@devcorp/utils` and published a malicious version. Your task is to:

1. **Red Team**: Execute a workspace/monorepo attack
2. **Blue Team**: Detect the compromised workspace package
3. **Security Team**: Implement workspace security defenses

## 🔧 Setup

### Prerequisites
- Node.js 16+ and npm installed
- Basic understanding of npm workspaces
- Understanding of monorepo structure

### Environment Setup

```bash
cd scenarios/12-workspace-monorepo-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

## 📝 Lab Tasks

### Part 1: Understanding Workspaces (20 minutes)

**Workspace Basics**:
- npm workspaces allow multiple packages in one repository
- Packages can depend on each other using workspace protocol
- Workspace packages share the same `node_modules` (by default)
- Postinstall scripts in workspace packages execute during workspace install

**Your Tasks**:
- Examine the workspace structure
- Understand how workspace dependencies work
- Review workspace configuration

```bash
# Check workspace root package.json
cat package.json

# View workspace packages
ls -la packages/

# Check workspace dependencies
cat packages/utils/package.json
cat packages/api/package.json
```

### Part 2: The Attack - Workspace Package Compromise (30 minutes)

**Attack Scenario**: Attacker has compromised `@devcorp/utils` workspace package.

```bash
# Review the legitimate workspace package
cat legitimate-packages/utils/package.json
cat legitimate-packages/utils/index.js

# Review the compromised workspace package
cat compromised-package/utils/package.json
cat compromised-package/utils/postinstall.js
```

**What Happens**:
1. Attacker gains access to workspace repository
2. Compromises `@devcorp/utils` package
3. Adds malicious postinstall script
4. All packages in workspace depend on `@devcorp/utils`
5. When workspace is installed, malicious code executes
6. Data is exfiltrated from all workspace packages

### Part 3: Detection Methods (40 minutes)

**Detection Techniques**:
- Workspace package scanning
- Postinstall script analysis
- Dependency tree analysis
- Workspace integrity checking
- Behavioral monitoring

See detection tools and README for detailed detection methods.

### Part 4: Incident Response (30 minutes)

**Response Steps**:
1. Identify compromised workspace package
2. Remove compromised package from workspace
3. Restore legitimate version
4. Audit all workspace packages
5. Review workspace access controls

## 🛡️ Defense Strategies

### Prevention

1. **Workspace Access Control**: Limit who can modify workspace packages
2. **Regular Audits**: Audit all workspace packages regularly
3. **Postinstall Monitoring**: Monitor postinstall scripts in workspace packages
4. **Dependency Review**: Review workspace dependencies carefully
5. **Version Control**: Use version control to track workspace changes

### Detection

1. **Workspace Scanning**: Scan all workspace packages for suspicious code
2. **Postinstall Analysis**: Analyze postinstall scripts in workspace packages
3. **Dependency Tree**: Monitor workspace dependency tree
4. **Behavioral Monitoring**: Monitor workspace package behavior
5. **Integrity Checking**: Verify workspace package integrity

### Response

1. **Immediate Containment**: Remove compromised workspace package
2. **Package Restoration**: Restore legitimate version from version control
3. **Workspace Audit**: Audit all workspace packages
4. **Access Review**: Review who has workspace access
5. **Incident Documentation**: Document the attack and response

## 📊 Key Takeaways

### Why Workspace Attacks Are Dangerous

1. **Shared Access**: Workspace packages can access each other
2. **Wide Impact**: One compromise affects entire workspace
3. **Trust**: Developers trust all workspace packages
4. **Hard to Detect**: Workspace packages treated as internal
5. **Modern Development**: Monorepos are increasingly common

### Best Practices

1. ✅ **Audit workspace packages** - Regularly audit all workspace packages
2. ✅ **Monitor postinstall scripts** - Monitor postinstall execution in workspaces
3. ✅ **Limit access** - Limit who can modify workspace packages
4. ✅ **Version control** - Use version control for all workspace changes
5. ✅ **Dependency review** - Review workspace dependencies carefully
6. ✅ **Integrity checks** - Verify workspace package integrity
7. ✅ **Incident plan** - Have incident response plan for workspace attacks

## 🔍 Real-World Impact

- **Monorepo Compromises**: Multiple organizations affected
- **Internal Package Attacks**: Workspace packages used for attacks
- **Detection Time**: Often weeks before discovery
- **Wide Impact**: All packages in workspace affected

## ⚠️ Safety & Ethics

**IMPORTANT**: This scenario is for **educational purposes only**.

- ✅ Use ONLY in isolated test environments
- ✅ Never deploy malicious code to production
- ✅ All malicious code requires `TESTBENCH_MODE=enabled`
- ✅ Workspaces are simulated for educational purposes

---

**Remember**: Workspace packages are a critical attack vector. Always audit workspace packages and monitor postinstall scripts!

🔐 Happy Learning!
