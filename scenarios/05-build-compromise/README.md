# Scenario 5: Build System Compromise 🎯

## 🎓 Learning Objectives

By completing this scenario, you will learn:
- How CI/CD pipelines get compromised
- Techniques attackers use to inject malicious code during builds
- Methods to detect build-time attacks
- Strategies to secure CI/CD pipelines
- Best practices for build system security

## 📖 Background

**Build System Compromise** occurs when attackers gain access to CI/CD pipelines, build servers, or deployment systems. This allows them to:
- Inject malicious code during the build process
- Modify build artifacts
- Compromise deployment pipelines
- Access sensitive build-time secrets

### Why It's Dangerous

- **High Privileges**: Build systems often have access to production secrets
- **Wide Impact**: Compromised builds affect all deployments
- **Stealth**: Malicious code injected during build appears legitimate
- **Persistence**: Can persist across multiple deployments

### Real-World Examples:

- **CodeCov (2021)**:
  - CI/CD system compromised
  - Bash uploader script modified
  - Stole environment variables from thousands of projects
  - Affected GitHub, Atlassian, and many others

- **SolarWinds (2020)**:
  - Build system compromised
  - Malicious code injected into software updates
  - Affected thousands of organizations worldwide

- **CircleCI (2023)**:
  - CI/CD platform compromised
  - Stolen API tokens used to access customer environments
  - Affected multiple organizations

## 🎯 Scenario Description

**Scenario**: A development team uses a CI/CD pipeline to build and deploy their application. An attacker has:
1. Gained access to the CI/CD system (through compromised credentials)
2. Modified the build script to inject malicious code
3. The malicious code gets compiled into the final build artifact

You will:
1. **Attacker Role**: Understand how build systems get compromised
2. **Victim Role**: Experience a compromised build
3. **Defender Role**: Detect and prevent build-time attacks

## 🔧 Setup

```bash
cd scenarios/05-build-compromise
export TESTBENCH_MODE=enabled
./setup.sh
```

## 📝 Lab Tasks

### Part 1: Understanding the Build System (15 minutes)

Examine the legitimate build setup:

```bash
cd legitimate-build
cat package.json
cat build.sh
cat .github/workflows/build.yml  # If using GitHub Actions
```

**Build System Details**:
- Build Tool: npm scripts / shell scripts
- CI/CD: Simulated with local scripts
- Artifacts: Compiled JavaScript bundles
- Secrets: Environment variables, API keys

**Your Tasks**:
- Understand the build process
- Review build scripts
- Identify where secrets are used
- Note the build artifacts

### Part 2: The Attack - Build Compromise (25 minutes)

**Scenario**: Attacker has obtained CI/CD credentials and modified the build process.

#### Step 1: Examine the Compromised Build

```bash
cd ../compromised-build
cat package.json
cat build.sh
```

**Key Changes**:
1. **Build Script Modified**: Injects malicious code during build
2. **Post-Build Hook**: Executes malicious code after build
3. **Secret Exfiltration**: Steals build-time secrets
4. **Artifact Poisoning**: Malicious code in final artifact

#### Step 2: Understand the Attack Vector

**Attack Methods**:
- **Build Script Injection**: Modify build scripts to inject code
- **Dependency Poisoning**: Compromise build dependencies
- **Secret Theft**: Access build-time environment variables
- **Artifact Modification**: Modify compiled output

#### Step 3: Review the Malicious Template

```bash
cat ../templates/build-compromise-template.js
```

**Techniques Used**:
- Code injection during compilation
- Secret harvesting from environment
- Post-build exfiltration
- Artifact poisoning

### Part 3: Simulating the Compromised Build (20 minutes)

#### Step 1: Run the Compromised Build

```bash
cd compromised-build
export TESTBENCH_MODE=enabled
export AWS_ACCESS_KEY_ID=test-key-12345
export AWS_SECRET_ACCESS_KEY=test-secret-67890
export DATABASE_PASSWORD=super-secret-password

# Run the build
npm run build
```

**What happens**:
- Build process executes
- Malicious code injects during build
- Secrets are collected
- Data is exfiltrated
- Final artifact contains malicious code

#### Step 2: Verify the Compromise

```bash
# Check build artifacts
ls -la dist/

# Check captured data
curl http://localhost:3000/captured-data
```

#### Step 3: Run the Compromised Application

```bash
cd ../victim-app
npm install ../compromised-build/dist/

# Run the application
export TESTBENCH_MODE=enabled
npm start
```

### Part 4: Detection Methods (25 minutes)

**Your Task**: Detect the build compromise

#### Detection Method 1: Build Script Review

```bash
# Compare build scripts
diff legitimate-build/build.sh compromised-build/build.sh

# Check for suspicious commands
grep -n "curl\|wget\|http\|eval" compromised-build/build.sh
```

#### Detection Method 2: Artifact Analysis

```bash
# Compare build artifacts
diff legitimate-build/dist/ compromised-build/dist/

# Check for suspicious code
grep -r "http\|process.env\|eval" compromised-build/dist/
```

#### Detection Method 3: Secret Monitoring

```bash
# Monitor secret access during build
cd detection-tools
node secret-monitor.js ../compromised-build
```

#### Detection Method 4: Build Log Analysis

```bash
# Review build logs
cat build.log | grep -i "error\|warning\|suspicious"

# Check for unexpected network requests
cat build.log | grep -i "http\|curl\|wget"
```

### Part 5: Prevention & Mitigation (30 minutes)

Implement multiple layers of defense:

#### Prevention Strategy 1: Build Script Integrity

```bash
# Use checksums for build scripts
sha256sum build.sh > build.sh.sha256

# Verify before build
sha256sum -c build.sh.sha256
```

#### Prevention Strategy 2: Least Privilege

```yaml
# CI/CD configuration
env:
  # Only provide necessary secrets
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_KEY }}
  # Don't expose all environment variables
```

#### Prevention Strategy 3: Build Isolation

```bash
# Use isolated build containers
docker build -t build-image .
docker run --rm build-image npm run build
```

#### Prevention Strategy 4: Artifact Verification

```bash
# Verify build artifacts
npm run build
npm run verify-artifacts

# Compare checksums
sha256sum dist/* > artifacts.sha256
```

#### Prevention Strategy 5: Secret Management

```bash
# Use secret management tools
# HashiCorp Vault, AWS Secrets Manager, etc.

# Never hardcode secrets in build scripts
# Use environment variables or secret stores
```

#### Prevention Strategy 6: Build Auditing

```yaml
# CI/CD audit logging
- name: Audit Build
  run: |
    npm run build
    npm run audit-build
    # Log all build activities
```

#### Prevention Strategy 7: Code Signing

```bash
# Sign build artifacts
gpg --sign dist/app.js

# Verify signatures before deployment
gpg --verify dist/app.js.asc
```

## ✅ Success Criteria

You've completed this scenario when you can:
- [ ] Understand how build systems get compromised
- [ ] Successfully simulate a build compromise
- [ ] Detect build-time attacks using multiple methods
- [ ] Implement at least 5 preventive measures
- [ ] Explain build security to a colleague

## 🎁 Bonus Challenges

1. **Multi-Stage Builds**: Exploit multi-stage Docker builds
2. **Dependency Injection**: Compromise build dependencies
3. **Secret Rotation**: Implement automated secret rotation
4. **Build Verification**: Create comprehensive build verification
5. **CI/CD Hardening**: Harden a complete CI/CD pipeline

## 📊 Attack Comparison

| Aspect | Build Compromise | Other Attacks |
|--------|-----------------|---------------|
| Target | CI/CD Pipeline | Packages |
| Mechanism | Build Script Injection | Package Modification |
| Detection | Very Hard | Hard |
| Impact | All Deployments | Package Users |
| Persistence | High | Medium |

## 🔍 Real-World Lessons

### Case Study: CodeCov (2021)

**What Happened**:
- CI/CD system compromised
- Bash uploader script modified
- Stole environment variables from thousands of projects
- Affected GitHub, Atlassian, and many others

**Lessons Learned**:
- Build systems are high-value targets
- Secret management is critical
- Build script integrity must be verified
- Monitoring is essential

## 💡 Key Takeaways

- **Build systems are high-value targets** - Protect them!
- **Secrets in builds are dangerous** - Use secret management
- **Build script integrity matters** - Verify checksums
- **Artifact verification is essential** - Sign and verify
- **Isolation prevents attacks** - Use containers
- **Auditing catches issues** - Log everything
- **Least privilege reduces risk** - Only necessary secrets

## 📚 Additional Resources

- [OWASP CI/CD Security](https://owasp.org/www-project-cicd-security/)
- [CISA Secure Software Development](https://www.cisa.gov/secure-software-development)
- [GitHub Actions Security](https://docs.github.com/en/actions/security)

## 🔗 Related Scenarios

**Prerequisites**: Scenarios 1, 2, 3, 4  
**Next**: Review all scenarios to understand the complete attack landscape

---

**Complete**: You've now covered all major supply chain attack vectors!

