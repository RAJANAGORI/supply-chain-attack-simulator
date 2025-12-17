# Scenario 2: Dependency Confusion Attack 🎯

## 🎓 Learning Objectives

By completing this scenario, you will learn:
- How dependency confusion attacks exploit package resolution mechanisms
- The difference between private and public package registries
- Techniques to hijack private package names
- Package manager resolution priority issues
- Enterprise supply chain vulnerabilities

## 📖 Background

**Dependency Confusion** (also called **Substitution Attack**) occurs when an attacker publishes a malicious package to a public registry with the same name as a private/internal package, exploiting how package managers resolve dependencies.

### The Vulnerability

Most package managers (npm, pip, etc.) check multiple registries when resolving dependencies:
1. First checks public registries (npmjs.com, pypi.org)
2. Then checks private/internal registries

When a higher version exists on the public registry, it may take precedence!

### Real-World Examples:
- **Alex Birsan (2021)**: Earned $130,000+ in bug bounties by exploiting this in Apple, Microsoft, Tesla, and 30+ other companies
- Compromised packages: `@microsoft/`, `@apple/`, `@tesla/` scoped packages
- Impact: Remote code execution in internal build systems

## 🎯 Scenario Description

**Scenario**: You work at "TechCorp" which uses private npm packages with the scope `@techcorp/`. An attacker discovered some of your internal package names from a leaked `package.json` file. Your task is to:

1. **Red Team**: Execute a dependency confusion attack
2. **Blue Team**: Detect and prevent the attack
3. **Security Team**: Implement robust defenses

## 🔧 Setup

### Prerequisites
- Node.js 16+ and npm installed
- Verdaccio (local npm registry)
- Docker (optional)

### Environment Setup

```bash
cd scenarios/02-dependency-confusion
export TESTBENCH_MODE=enabled
./setup.sh
```

## 📝 Lab Tasks

### Part 1: Understanding the Environment (15 minutes)

**TechCorp's Internal Setup**:

1. **Private Packages** (simulated):
   - `@techcorp/auth-lib` - Authentication library
   - `@techcorp/data-utils` - Data processing utilities
   - `@techcorp/api-client` - Internal API client

2. **Package Resolution Order**:
   ```bash
   # View npm registry configuration
   npm config get registry
   
   # Check .npmrc file
   cat .npmrc
   ```

**Your Tasks**:
- Examine the corporate application at `./corporate-app/`
- Review the internal packages in `./internal-packages/`
- Understand the dependency structure
- Identify the vulnerability

### Part 2: Reconnaissance (20 minutes)

**Attacker Perspective**: How do attackers find internal package names?

**Common Sources**:
1. **Public Git Repositories**: Accidentally committed `package.json`
2. **Job Postings**: Technical requirements listing internal tools
3. **Public CI/CD Logs**: Build outputs showing package names
4. **JavaScript Bundles**: Inspecting compiled code
5. **Employee LinkedIn**: Posts about internal tools

**Exercise**: Examine `./leaked-data/` folder to find internal package names

```bash
# Simulated leaked package.json from public repo
cat leaked-data/package.json

# Extract internal package names
grep "@techcorp" leaked-data/package.json
```

**Questions**:
- Which internal packages did you discover?
- What versions are they using?
- How could this leak be prevented?

### Part 3: Execute the Attack (30 minutes)

**Your Mission**: Publish malicious packages to public registry that will be installed instead of internal ones.

#### Step 1: Set Up Registries

```bash
# Start local "public" registry (simulates npmjs.com)
cd infrastructure
docker-compose up -d public-registry

# Start local "private" registry (simulates TechCorp's internal registry)
docker-compose up -d private-registry
```

#### Step 2: Create Malicious Package

```bash
cd attacker-packages/@techcorp/auth-lib
```

**Key Strategy**: Publish with a higher version number!

```json
{
  "name": "@techcorp/auth-lib",
  "version": "999.999.999",  // Higher than internal version!
  "description": "MALICIOUS - Educational Demo"
}
```

**Implementation Requirements**:
1. Package must provide basic functionality (avoid detection)
2. Include exfiltration mechanism
3. Target build-time or runtime execution

Template provided at: `./templates/dependency-confusion-template.js`

#### Step 3: Publish to Public Registry

```bash
# Set registry to "public" (simulated)
npm config set registry http://localhost:4873

# Publish malicious package
npm publish
```

#### Step 4: Trigger the Attack

```bash
# Victim (corporate app) installs dependencies
cd ../../corporate-app

# Clear cache to simulate fresh install
rm -rf node_modules package-lock.json

# Install dependencies (will prefer public registry!)
npm install

# Run the application
export TESTBENCH_MODE=enabled
npm start
```

#### Step 5: Verify Compromise

```bash
# Check which package was installed
npm list @techcorp/auth-lib

# View installed package
cat node_modules/@techcorp/auth-lib/package.json

# Check captured data
curl http://localhost:3000/captured-data
```

### Part 4: Detection (25 minutes)

**Your Task**: Implement detection mechanisms to identify dependency confusion attacks.

#### Detection Method 1: Registry Verification

```bash
# Check package source
npm view @techcorp/auth-lib dist.tarball

# Compare checksums
./detection-tools/verify-sources.sh
```

#### Detection Method 2: Version Anomaly Detection

Create a script to detect suspicious version numbers:

```javascript
// detection-tools/version-checker.js
// Detect versions like 999.999.999 that are likely malicious
```

#### Detection Method 3: Package Inspection

```bash
# Automated package analysis
node detection-tools/dependency-confusion-scanner.js ./corporate-app
```

**What to Look For**:
- Unexpected registry sources
- Abnormally high version numbers (999.x, 9999.x)
- Packages from public registry when private expected
- Recently published packages (suspicious timing)
- Unusual dependencies or network activity

#### Detection Method 4: Build-Time Scanning

Integrate into CI/CD:

```yaml
# .github/workflows/security-scan.yml
- name: Check for Dependency Confusion
  run: |
    node scripts/scan-dependencies.js
    if [ $? -ne 0 ]; then
      echo "⚠️ Dependency confusion detected!"
      exit 1
    fi
```

### Part 5: Prevention & Mitigation (30 minutes)

Implement multiple layers of defense:

#### Defense 1: Scope Restrictions (.npmrc)

```bash
# Configure npm to only use private registry for @techcorp scope
cat > .npmrc << EOF
@techcorp:registry=http://private-registry.techcorp.com/
registry=https://registry.npmjs.org/
EOF
```

#### Defense 2: Package Lock Files

```bash
# Ensure integrity checking
npm ci --audit

# Never use npm install in CI/CD, always use npm ci
```

#### Defense 3: Registry Isolation

```bash
# Block public registry for internal scopes at network level
# Configure firewall/proxy rules
```

#### Defense 4: Namespace Reservation

```bash
# Reserve your organization's scope on public registries
npm owner add your-team @techcorp
# Publish placeholder packages if needed
```

#### Defense 5: Dependency Pinning

```json
{
  "dependencies": {
    "@techcorp/auth-lib": "1.2.3"  // Exact version, not ^1.2.3
  }
}
```

#### Defense 6: Integrity Checking

```json
{
  "dependencies": {
    "@techcorp/auth-lib": {
      "version": "1.2.3",
      "integrity": "sha512-...",
      "resolved": "http://private-registry.techcorp.com/..."
    }
  }
}
```

#### Defense 7: Build-Time Validation

Create a pre-install hook:

```bash
# package.json
{
  "scripts": {
    "preinstall": "node scripts/validate-dependencies.js"
  }
}
```

## ✅ Success Criteria

You've completed this scenario when you can:
- [ ] Successfully execute a dependency confusion attack
- [ ] Explain the package resolution vulnerability
- [ ] Detect malicious packages using multiple methods
- [ ] Implement at least 5 preventive measures
- [ ] Configure proper registry scoping
- [ ] Document the attack chain

## 🎁 Bonus Challenges

1. **Multi-Language Attack**: Implement dependency confusion for Python (pip) or Ruby (gem)
2. **Registry Priority Exploit**: Configure complex registry setups with multiple private registries
3. **Monorepo Attack**: Exploit workspace dependencies
4. **Transitive Dependencies**: Hide malicious package in sub-dependencies
5. **Version Range Exploit**: Use semantic versioning to stay within acceptable ranges
6. **Internal Registry Compromise**: Simulate compromise of private registry itself

## 📊 Attack Comparison

| Aspect | Typosquatting | Dependency Confusion |
|--------|---------------|---------------------|
| Target | Public packages | Private packages |
| Mechanism | Human error | System configuration |
| Detection | Moderate | Difficult |
| Impact | Individual devs | Entire organization |
| Sophistication | Low | Medium-High |

## 🔍 Real-World Lessons

### Case Study: Alex Birsan's Discovery (2021)

**Impact**:
- 35+ companies affected
- $130,000 in bug bounties
- Microsoft, Apple, Tesla, Netflix, Uber affected

**Attack Method**:
1. Found leaked `package.json` files on GitHub
2. Identified private package names (e.g., `@microsoft/...`)
3. Published higher version numbers to public npm
4. Companies' build systems automatically downloaded malicious packages

**Microsoft's Response**:
- Rapid patch deployment
- Registry configuration updates
- Mandatory scope restrictions
- Build pipeline security enhancements

## 📚 Additional Resources

- [Original Dependency Confusion Research](https://medium.com/@alex.birsan)
- [npm Scope Documentation](https://docs.npmjs.com/cli/v7/using-npm/scope)
- [Package Lock Security](https://docs.npmjs.com/cli/v7/configuring-npm/package-lock-json)

## 🔗 Related Scenarios

**Prerequisites**: Scenario 1 (Typosquatting)  
**Next**: Scenario 3 (Compromised Package)

## 💡 Key Takeaways

- **Package manager defaults are insecure** for organizations with private packages
- **Higher version numbers** can override internal packages
- **Registry configuration** is critical for enterprise security
- **Package lock files** prevent but don't eliminate the risk
- **Defense in depth** requires multiple controls
- **Organizational scope** should be protected on public registries

## 🆘 Hints

<details>
<summary>Hint 1: Why does the public package get installed?</summary>

Package managers use **version resolution**. When checking multiple registries:
1. Fetches available versions from all configured registries
2. Selects the highest version that satisfies the dependency range
3. If public registry has version 999.0.0 and private has 1.2.3, public wins!

Fix: Configure `.npmrc` to restrict scopes to specific registries.
</details>

<details>
<summary>Hint 2: How to properly configure scoped registries</summary>

```bash
# In .npmrc:
@techcorp:registry=https://private.registry.com/
//private.registry.com/:_authToken=${NPM_TOKEN}

# This ensures @techcorp/* packages ONLY come from private registry
```
</details>

<details>
<summary>Hint 3: Detection script example</summary>

```javascript
const { execSync } = require('child_process');

function checkDependencySource(packageName) {
  const info = execSync(`npm view ${packageName} dist.tarball`).toString();
  
  if (packageName.startsWith('@techcorp/') && !info.includes('private.registry')) {
    console.error(`⚠️ ALERT: ${packageName} from wrong registry!`);
    return false;
  }
  return true;
}
```
</details>

---

**Next**: [Scenario 3: Compromised Package →](../03-compromised-package/README.md)

