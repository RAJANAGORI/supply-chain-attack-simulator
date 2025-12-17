# 🚀 Zero to Hero: Scenario 2 - Dependency Confusion Attack

Welcome! This guide will take you from zero knowledge to successfully completing the Dependency Confusion attack scenario. We'll go step by step, explaining everything along the way.

## 📚 What You'll Learn

By the end of this guide, you will:
- Understand what dependency confusion attacks are
- Learn how package resolution works
- Execute a dependency confusion attack (safely in a test environment)
- Detect and prevent dependency confusion vulnerabilities
- Configure proper registry scoping

---

## Part 1: Understanding Dependency Confusion (10 minutes)

### What is Dependency Confusion?

**Dependency Confusion** (also called **Substitution Attack**) occurs when an attacker publishes a malicious package to a public registry with the same name as a private/internal package, exploiting how package managers resolve dependencies.

### The Vulnerability

Most package managers (npm, pip, etc.) check multiple registries when resolving dependencies:
1. First checks public registries (npmjs.com, pypi.org)
2. Then checks private/internal registries

**The Problem**: When a higher version exists on the public registry, it may take precedence over the private one!

### Real-World Example: Alex Birsan (2021)

- Found leaked `package.json` files on GitHub
- Identified private package names (e.g., `@microsoft/...`, `@apple/...`)
- Published higher version numbers to public npm
- Companies' build systems automatically downloaded malicious packages
- **Result**: $130,000+ in bug bounties from 35+ companies including Microsoft, Apple, Tesla, Netflix, Uber

### How It Works

```
1. Company has private package: @techcorp/auth-lib version 1.0.0
2. Attacker publishes: @techcorp/auth-lib version 999.999.999 to public npm
3. Developer runs: npm install
4. npm sees version 999.999.999 is higher than 1.0.0
5. npm installs the malicious version from public registry!
```

---

## Part 2: Prerequisites Check (5 minutes)

Before we start, make sure you've completed:

- ✅ Scenario 1 (Typosquatting) - Understanding basic supply chain attacks
- ✅ Node.js 16+ and npm installed
- ✅ Docker (optional but recommended)
- ✅ TESTBENCH_MODE enabled

Verify your setup:

```bash
node --version   # Should be v16+
npm --version    # Should be v7+
docker --version # Optional
echo $TESTBENCH_MODE  # Should output: enabled
```

---

## Part 3: Setting Up Scenario 2 (15 minutes)

### Step 1: Navigate to Scenario Directory

```bash
cd scenarios/02-dependency-confusion
```

### Step 2: Run the Setup Script

```bash
./setup.sh
```

**What this does:**
- Creates directory structure
- Sets up internal packages (simulating TechCorp's private packages)
- Creates leaked data (simulating reconnaissance)
- Sets up detection tools
- Creates validation scripts

**Expected output:**
- You'll see setup progress messages
- Directories and files will be created
- At the end, it will show "Next Steps"

### Step 3: Understand the Environment

**TechCorp's Internal Setup:**
- **Private Packages** (in `internal-packages/`):
  - `@techcorp/auth-lib` - Authentication library
  - `@techcorp/data-utils` - Data processing utilities
  - `@techcorp/api-client` - Internal API client

**Corporate Application** (in `corporate-app/`):
- Uses all three internal packages
- Depends on them for core functionality

**Leaked Data** (in `leaked-data/`):
- Simulates a `package.json` accidentally committed to a public GitHub repo
- Contains internal package names (this is what attackers find!)

---

## Part 4: Understanding the Attack Flow (15 minutes)

### Step 1: Reconnaissance (How Attackers Find Targets)

Attackers discover internal package names from:

1. **Public Git Repositories**: Accidentally committed `package.json`
2. **Job Postings**: Technical requirements listing internal tools
3. **Public CI/CD Logs**: Build outputs showing package names
4. **JavaScript Bundles**: Inspecting compiled code
5. **Employee LinkedIn**: Posts about internal tools

**Let's see what was "leaked":**

```bash
cat leaked-data/package.json
```

**What you'll see:**
- Internal package names: `@techcorp/auth-lib`, `@techcorp/data-utils`, `@techcorp/api-client`
- Version requirements: `^1.0.0`

**This is gold for attackers!** They now know:
- Which packages exist internally
- What versions are being used
- The organization's naming convention

### Step 2: Understanding Package Resolution

Let's see how npm resolves packages:

```bash
# Check current registry configuration
npm config get registry

# Check if .npmrc exists
cat .npmrc 2>/dev/null || echo "No .npmrc file"
```

**The Problem:**
- Without proper `.npmrc` configuration, npm checks BOTH public and private registries
- It picks the HIGHEST version number available
- If public registry has version 999.999.999 and private has 1.0.0, public wins!

### Step 3: The Attack Strategy

**Attacker's Plan:**
1. Publish malicious package with same name as internal package
2. Use version number HIGHER than internal version (999.999.999)
3. Wait for developers to run `npm install`
4. Malicious package gets installed instead of internal one

---

## Part 5: Executing the Attack (30 minutes)

### Step 1: Examine Internal Packages

First, let's see what the legitimate internal packages look like:

```bash
# View internal auth-lib
cat internal-packages/@techcorp/auth-lib/index.js
cat internal-packages/@techcorp/auth-lib/package.json
```

**Notice:**
- Version: `1.0.0`
- It's a legitimate authentication library
- Clean, straightforward code

### Step 2: Create the Malicious Package

Now we'll create a malicious version that mimics the legitimate one:

```bash
# Navigate to attacker packages directory
cd attacker-packages/@techcorp/auth-lib

# Copy the template
cp ../../templates/dependency-confusion-template.js index.js

# Create package.json with HIGH version number
cat > package.json << 'EOF'
{
  "name": "@techcorp/auth-lib",
  "version": "999.999.999",
  "description": "TechCorp Authentication Library [MALICIOUS - EDUCATIONAL]",
  "main": "index.js",
  "keywords": ["auth", "authentication", "techcorp"],
  "author": "Attacker (Educational Demo)",
  "license": "MIT"
}
EOF
```

**Key Points:**
- **Same name**: `@techcorp/auth-lib` (matches internal package)
- **Higher version**: `999.999.999` (much higher than internal `1.0.0`)
- **Malicious code**: Will exfiltrate data while providing basic functionality

### Step 3: Review the Malicious Template

```bash
cat index.js
```

**What it does:**
- Provides the same basic functionality (to avoid suspicion)
- Collects environment variables
- Sends data to attacker server
- Runs automatically when imported

**Safety features:**
- Only works when `TESTBENCH_MODE=enabled`
- Only sends to `localhost:3000` (not real attackers)

### Step 4: Start the Mock Attacker Server

```bash
# Go back to scenario root
cd ../../

# Start mock server (if not already running from Docker)
node ../01-typosquatting/infrastructure/mock-server.js &
```

**Verify it's running:**
```bash
curl http://localhost:3000/captured-data
```

Should return: `{"captures": []}`

### Step 5: Install the Malicious Package (Simulating the Attack)

Now let's simulate what happens when a developer runs `npm install`:

```bash
# Navigate to corporate app
cd corporate-app

# Clear any existing installations
rm -rf node_modules package-lock.json

# Install dependencies (this will prefer the malicious package!)
npm install ../attacker-packages/@techcorp/auth-lib
```

**What just happened:**
- npm checked for `@techcorp/auth-lib`
- Found version `999.999.999` in the attacker package
- Found version `1.0.0` in internal packages
- **Installed the higher version (999.999.999) - the malicious one!**

### Step 6: Run the Corporate Application

```bash
# Make sure TESTBENCH_MODE is enabled
export TESTBENCH_MODE=enabled

# Run the application
npm start
```

**What to expect:**
- The application will start
- The malicious package will execute
- Data will be exfiltrated to the mock server

### Step 7: Verify the Compromise

```bash
# Check which version was installed
npm list @techcorp/auth-lib

# View the installed package
cat node_modules/@techcorp/auth-lib/package.json

# Check captured data
curl http://localhost:3000/captured-data
```

**What you should see:**
- Version installed: `999.999.999` (malicious version)
- Captured data in the mock server
- The attack was successful!

---

## Part 6: Understanding What Happened (10 minutes)

### The Attack Flow

1. **Reconnaissance**: Attacker found leaked `package.json` with internal package names
2. **Package Creation**: Attacker created malicious package with same name
3. **Version Manipulation**: Used version `999.999.999` (higher than internal `1.0.0`)
4. **Installation**: Developer ran `npm install`, malicious package was installed
5. **Execution**: Malicious code ran and exfiltrated data

### Why It Worked

**The Root Cause:**
- npm's default behavior checks multiple registries
- Without proper `.npmrc` configuration, it doesn't restrict scoped packages to private registries
- Version resolution picks the highest version available
- Public registry version (999.999.999) > Private registry version (1.0.0)

**In a Real Attack:**
- Attacker publishes to public npm (npmjs.com)
- Thousands of companies could be affected
- Build systems automatically install the malicious version
- Data exfiltration happens silently

---

## Part 7: Detecting the Attack (25 minutes)

Now let's switch roles and become defenders. How can we detect this attack?

### Method 1: Version Anomaly Detection

```bash
# Run the dependency confusion scanner
cd ..
node detection-tools/dependency-confusion-scanner.js corporate-app
```

**What it checks:**
- Unusually high version numbers (like 999.999.999)
- Packages from unexpected registries
- Suspicious version patterns

### Method 2: Registry Source Verification

```bash
cd corporate-app

# Check where packages came from
npm list @techcorp/auth-lib

# Check package-lock.json for registry sources
cat package-lock.json | grep -A 5 "@techcorp/auth-lib"
```

**Red flags:**
- Internal packages coming from public registry
- Unexpected registry URLs
- Suspicious version numbers

### Method 3: Package Inspection

```bash
# Check the installed package
cat node_modules/@techcorp/auth-lib/index.js | head -50
```

**What to look for:**
- Network requests
- Data collection
- Suspicious code patterns
- Obfuscation

### Method 4: Automated Scanning

```bash
# Use the detection tool
cd ../detection-tools
node dependency-confusion-scanner.js ../corporate-app
```

**Detection capabilities:**
- Scans for scoped packages
- Checks version numbers
- Identifies suspicious patterns
- Reports potential attacks

---

## Part 8: Prevention and Mitigation (30 minutes)

Now that we've seen how the attack works, how can we prevent it?

### Prevention Strategy 1: Configure Scope Restrictions (.npmrc)

**This is the MOST IMPORTANT defense!**

```bash
# Create .npmrc in corporate-app directory
cd corporate-app

cat > .npmrc << 'EOF'
# Private packages from private registry ONLY
@techcorp:registry=http://localhost:4873/

# Public packages from public registry
registry=https://registry.npmjs.org/
EOF
```

**What this does:**
- Forces `@techcorp/*` packages to ONLY come from private registry
- Public registry is ignored for internal scopes
- Prevents dependency confusion attacks

**Test it:**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Now it should use internal packages
npm list @techcorp/auth-lib
```

### Prevention Strategy 2: Use Package Lock Files

```bash
# Ensure package-lock.json is committed
git add package-lock.json
git commit -m "Add package-lock.json for security"

# In CI/CD, always use npm ci (not npm install)
npm ci
```

**Benefits:**
- Locks exact versions
- Prevents automatic updates to malicious versions
- Provides integrity checking

### Prevention Strategy 3: Registry Isolation

**Network-level protection:**
- Block public registry access for internal scopes at firewall/proxy level
- Use private registries exclusively for internal packages
- Implement network segmentation

### Prevention Strategy 4: Namespace Reservation

**Reserve your organization's scope on public registries:**

```bash
# Reserve the scope (prevents others from using it)
npm owner add your-team @techcorp

# Optionally publish placeholder packages
# This makes it harder for attackers to use your scope
```

### Prevention Strategy 5: Dependency Pinning

**Use exact versions (not ranges):**

```json
{
  "dependencies": {
    "@techcorp/auth-lib": "1.0.0"  // Exact version, not ^1.0.0
  }
}
```

### Prevention Strategy 6: Pre-Install Validation

The setup script created a validation script:

```bash
# View the validation script
cat corporate-app/scripts/validate-dependencies.js

# It runs automatically before install (preinstall hook)
```

**Enhance it to:**
- Check registry sources
- Verify version numbers
- Validate integrity hashes
- Ensure packages come from correct registries

### Prevention Strategy 7: Automated Scanning in CI/CD

```yaml
# .github/workflows/security.yml
- name: Check for Dependency Confusion
  run: |
    node scripts/scan-dependencies.js
    if [ $? -ne 0 ]; then
      echo "⚠️ Dependency confusion detected!"
      exit 1
    fi
```

---

## Part 9: Advanced Topics (20 minutes)

### Understanding Registry Priority

npm checks registries in this order:
1. Scope-specific registry (from `.npmrc`)
2. Default registry (from `.npmrc` or npm config)
3. Public registry (npmjs.com)

**Key insight:** If you don't configure scope-specific registries, npm will check the public registry first!

### Version Resolution Logic

npm uses semantic versioning (semver) to resolve versions:
- `^1.0.0` means "compatible with 1.0.0" (allows 1.0.1, 1.1.0, but not 2.0.0)
- `999.999.999` satisfies `^1.0.0` because it's higher
- This is why attackers use extremely high version numbers

### Multi-Registry Scenarios

**Complex setups:**
- Multiple private registries
- Different scopes for different registries
- Fallback mechanisms

**Best practice:** Always explicitly configure scope-to-registry mappings.

---

## Part 10: Clean Up and Next Steps (5 minutes)

### Clean Up

```bash
# Stop mock server (if running manually)
# Find process: ps aux | grep mock-server
# Kill it: kill <PID>

# Or if using Docker
cd ../../docker
docker-compose down
```

### What You've Accomplished

✅ Understood dependency confusion attacks  
✅ Executed a dependency confusion attack (safely)  
✅ Detected the attack using multiple methods  
✅ Implemented preventive measures  
✅ Configured proper registry scoping  

### Next Steps

1. **Try Scenario 3**: Compromised Package Attack
2. **Experiment**: Try different version numbers and registry configurations
3. **Read more**: Study Alex Birsan's original research
4. **Practice**: Implement these defenses in a real project

---

## 🆘 Troubleshooting

### Problem: "Package not found"

**Solution:**
```bash
# Make sure you're using the correct path
cd scenarios/02-dependency-confusion
npm install ../attacker-packages/@techcorp/auth-lib
```

### Problem: "Wrong version installed"

**Solution:**
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Problem: ".npmrc not working"

**Solution:**
```bash
# Verify .npmrc is in the right location (project root)
cat .npmrc

# Check npm config
npm config list

# Test registry resolution
npm view @techcorp/auth-lib
```

---

## 📚 Additional Resources

- **Main README**: `README.md`
- **Scenario README**: `scenarios/02-dependency-confusion/README.md`
- **Alex Birsan's Research**: https://medium.com/@alex.birsan
- **npm Scope Documentation**: https://docs.npmjs.com/cli/v7/using-npm/scope

---

## ⚠️ Important Reminders

- ✅ This is for **EDUCATIONAL purposes only**
- ✅ Use **ONLY in isolated environments**
- ✅ **Never** deploy malicious code to production
- ✅ **Always** set `TESTBENCH_MODE=enabled`
- ✅ **Never** test on systems you don't own

---

## 🎉 Congratulations!

You've completed the Dependency Confusion attack scenario! You now understand:
- How dependency confusion attacks work
- How to detect them
- How to prevent them with proper configuration

**Remember**: Proper registry configuration is critical for enterprise security!

Happy learning! 🔐

