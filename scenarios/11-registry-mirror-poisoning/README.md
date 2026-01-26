# Scenario 11: Registry Mirror Poisoning Attack 🎯

## 🎓 Learning Objectives

By completing this scenario, you will learn:
- How internal npm registry mirrors work
- How attackers compromise registry mirrors to serve malicious packages
- Enterprise-specific supply chain vulnerabilities
- Techniques to detect mirror compromise
- Mirror validation and upstream verification methods
- Defense strategies for registry security

## 📖 Background

**Registry Mirror Poisoning** occurs when an attacker compromises an internal npm registry mirror. The mirror serves malicious packages instead of legitimate ones, affecting all internal developers who use the mirror. This is an enterprise-specific attack that targets organizations with internal package registries.

### Why This Attack is Dangerous

1. **Single Point of Failure**: One compromised mirror affects all developers
2. **Wide Impact**: All internal developers using the mirror are compromised
3. **Hard to Detect**: Mirror appears legitimate and trusted
4. **Persistent**: Attack persists until mirror is fixed or replaced
5. **Enterprise-Specific**: Targets organizations with internal infrastructure

### Real-World Examples

- **Internal Registry Compromises**: Multiple organizations have had internal mirrors compromised
- **Supply Chain Attacks**: Mirrors used to distribute malicious packages internally
- **Credential Theft**: Compromised mirrors used to steal developer credentials
- **Backdoor Installation**: Malicious packages installed through trusted mirrors

## 🎯 Scenario Description

**Scenario**: You work at "EnterpriseCorp" which uses an internal npm registry mirror for faster package downloads and offline capability. An attacker has compromised the mirror server and is serving malicious packages instead of legitimate ones. Your task is to:

1. **Red Team**: Execute a registry mirror poisoning attack
2. **Blue Team**: Detect the mirror compromise
3. **Security Team**: Implement mirror validation and defenses

## 🔧 Setup

### Prerequisites
- Node.js 16+ and npm installed
- Basic understanding of npm registry configuration
- Understanding of enterprise infrastructure

### Environment Setup

```bash
cd scenarios/11-registry-mirror-poisoning
export TESTBENCH_MODE=enabled
./setup.sh
```

## 📝 Lab Tasks

### Part 1: Understanding Registry Mirrors (20 minutes)

**Mirror Basics**:
- Internal mirrors cache packages from public registries (npmjs.com)
- Provide faster downloads and offline capability
- Organizations configure `.npmrc` to use mirrors
- Mirrors can be compromised to serve malicious packages

**Your Tasks**:
- Examine the legitimate mirror setup
- Understand how mirrors work
- Review mirror configuration

```bash
# Check npm registry configuration
npm config get registry

# View .npmrc file
cat corporate-app/.npmrc
```

### Part 2: The Attack - Mirror Compromise (30 minutes)

**Attack Scenario**: Attacker has compromised the internal mirror server.

```bash
cd compromised-mirror
cat README.md  # Explains mirror compromise
```

**What Happens**:
1. Attacker gains access to mirror server
2. Replaces legitimate packages with malicious versions
3. Mirror serves malicious packages to all developers
4. Developers install packages from mirror
5. Malicious packages execute and exfiltrate data

### Part 3: Detection Methods (40 minutes)

**Detection Techniques**:
- Upstream verification (compare with npmjs.com)
- Package integrity checking (checksums, signatures)
- Mirror behavior analysis
- Package version comparison
- Anomaly detection

See detection tools and README for detailed detection methods.

### Part 4: Incident Response (30 minutes)

**Response Steps**:
1. Disable compromised mirror immediately
2. Restore mirror from backup or rebuild
3. Verify all packages match upstream
4. Notify developers of compromise
5. Review mirror access controls

## 🛡️ Defense Strategies

### Prevention

1. **Secure Mirror Access**: Limit who can modify mirror
2. **Regular Audits**: Audit mirror configuration and packages
3. **Upstream Verification**: Verify packages match upstream registry
4. **Access Controls**: Implement strict access controls
5. **Monitoring**: Monitor mirror behavior and package requests

### Detection

1. **Upstream Verification**: Compare packages with npmjs.com
2. **Integrity Checking**: Verify package checksums and signatures
3. **Behavioral Monitoring**: Monitor mirror behavior for anomalies
4. **Package Scanning**: Scan packages for malicious code
5. **Anomaly Detection**: Detect unusual package requests or versions

### Response

1. **Immediate Containment**: Disable compromised mirror
2. **Mirror Restoration**: Restore from backup or rebuild
3. **Upstream Verification**: Verify all packages match upstream
4. **User Notification**: Notify developers of compromise
5. **Access Review**: Review who has mirror access

## 📊 Key Takeaways

### Why Mirror Poisoning is Dangerous

1. **Single Point of Failure**: One compromise affects all developers
2. **Trust**: Developers trust the internal mirror
3. **Hard to Detect**: Mirror appears legitimate
4. **Wide Impact**: All internal developers affected
5. **Persistent**: Attack persists until mirror is fixed

### Best Practices

1. ✅ **Verify upstream** - Always verify packages match upstream registry
2. ✅ **Monitor mirror** - Monitor mirror behavior and requests
3. ✅ **Secure access** - Limit who can modify mirror
4. ✅ **Regular audits** - Audit mirror configuration and packages
5. ✅ **Integrity checks** - Verify package checksums and signatures
6. ✅ **Backup strategy** - Maintain mirror backups
7. ✅ **Incident plan** - Have incident response plan ready

## 🔍 Real-World Impact

- **Enterprise Compromises**: Multiple organizations affected
- **Supply Chain Attacks**: Mirrors used to distribute malicious packages
- **Detection Time**: Often weeks or months before discovery
- **Wide Impact**: All developers using mirror affected

## ⚠️ Safety & Ethics

**IMPORTANT**: This scenario is for **educational purposes only**.

- ✅ Use ONLY in isolated test environments
- ✅ Never deploy malicious code to production
- ✅ All malicious code requires `TESTBENCH_MODE=enabled`
- ✅ Mirrors are simulated for educational purposes

---

**Remember**: Registry mirrors are single points of failure. Always verify packages match upstream and monitor mirror behavior!

🔐 Happy Learning!
