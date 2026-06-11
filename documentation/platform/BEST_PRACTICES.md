# Supply Chain Security Best Practices

This guide outlines best practices for securing your software supply chain, learned from the scenarios in this testbench.

## 📋 Table of Contents

1. [Dependency Management](#dependency-management)
2. [Package Verification](#package-verification)
3. [Secrets Management](#secrets-management)
4. [Build Pipeline Security](#build-pipeline-security)
5. [Runtime Protection](#runtime-protection)
6. [Incident Response](#incident-response)

## Dependency Management

### ✅ DO: Use Package Lock Files

**Why**: Ensures consistent installations and prevents automatic updates to malicious versions.

```bash
# Generate and commit package-lock.json
npm install
git add package-lock.json

# In CI/CD, always use:
npm ci --audit
# NEVER use: npm install
```

**Benefits**:
- Integrity verification via checksums
- Deterministic builds
- Protection against dependency confusion
- Audit trail of dependency changes

### ✅ DO: Pin Exact Versions

**Why**: Prevents automatic updates to compromised versions.

```json
{
  "dependencies": {
    "express": "4.18.2",        // ✅ Exact version
    "lodash": "~4.17.21",       // ⚠️ Patch updates only
    "react": "^18.2.0"          // ❌ Minor/patch updates (risky)
  }
}
```

**Recommendation**: Use exact versions for critical dependencies, ranges for development tools.

### ✅ DO: Regular Dependency Audits

**Why**: Identify and fix known vulnerabilities.

```bash
# Run audit regularly
npm audit

# Fix vulnerabilities automatically
npm audit fix

# For detailed report
npm audit --json > audit-report.json
```

**Automation**:
```yaml
# .github/workflows/security.yml
name: Security Audit
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm audit --audit-level=moderate
```

### ✅ DO: Minimize Dependencies

**Why**: Each dependency is a potential attack vector.

```bash
# Analyze dependency tree
npm list --all

# Find duplicate dependencies
npm dedupe

# Remove unused dependencies
npm prune

# Check package size
npx cost-of-modules
```

**Questions to ask**:
- Is this dependency necessary?
- Can I implement this functionality myself?
- Does this package have many transitive dependencies?
- Is this package actively maintained?

### ❌ DON'T: Use Wildcards

```json
{
  "dependencies": {
    "lodash": "*",      // ❌ NEVER do this!
    "axios": "latest"   // ❌ Dangerous!
  }
}
```

## Package Verification

### ✅ DO: Verify Package Source

**Why**: Ensure packages come from expected registries.

```bash
# Check package source
npm view express dist.tarball

# For private packages, configure .npmrc:
@yourcompany:registry=https://private-registry.company.com/
//private-registry.company.com/:_authToken=${NPM_TOKEN}

# Block public registry for private scopes
@yourcompany:registry=https://private-registry.company.com/
```

### ✅ DO: Review Package Before Installing

**Why**: Catch malicious packages before they enter your system.

```bash
# Check package info
npm view package-name

# Check maintainers
npm owner ls package-name

# Check download stats
npm view package-name --json

# Review package contents
npm pack package-name
tar -xzf package-name-*.tgz
cat package/index.js
```

**Red flags**:
- Recently published (< 1 week old)
- Few downloads
- No GitHub repository
- Suspicious maintainer
- Unusual dependencies
- Install scripts (pre/post install)

### ✅ DO: Use Integrity Checking

**Why**: Verify package hasn't been tampered with.

```bash
# Verify integrity
npm install --integrity

# Check integrity hash in package-lock.json
cat package-lock.json | grep integrity
```

### ✅ DO: Implement Automated Scanning

**Tools**:

1. **Socket.dev** - Detects supply chain attacks
```bash
npx socket-dev scan
```

2. **Snyk** - Vulnerability scanning
```bash
npx snyk test
npx snyk monitor
```

3. **npm audit** - Built-in scanning
```bash
npm audit
```

4. **OSSF Scorecard** - Project health
```bash
npx @ossf/scorecard
```

### ❌ DON'T: Ignore Security Warnings

```bash
# ❌ Bad
npm install --force
npm audit fix --force

# ✅ Good
npm audit
# Review each vulnerability
# Update or remove vulnerable packages
```

## Secrets Management

### ✅ DO: Use Environment Variables

**Why**: Separate secrets from code.

```bash
# .env (never commit!)
API_KEY=secret-value
DATABASE_URL=postgres://...

# In application
require('dotenv').config();
const apiKey = process.env.API_KEY;
```

**⚠️ But remember**: Malicious packages can access `process.env`!

### ✅ DO: Use Secrets Vaults

**Why**: Centralized, encrypted secrets management.

**Options**:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager

```javascript
// Fetch secrets at runtime
const vault = require('@hashicorp/vault-client');
const secret = await vault.read('secret/data/api-key');
```

### ✅ DO: Minimize Secret Exposure

**Principle**: Secrets should be:
- Loaded just-in-time
- Kept in memory briefly
- Never logged
- Cleared after use

```javascript
// ❌ Bad - exposed to all packages
const API_KEY = process.env.API_KEY;

// ✅ Better - lazy loading
function getApiKey() {
  return process.env.API_KEY;
}

// ✅ Best - from vault, scoped access
async function makeSecureRequest() {
  const key = await vault.getSecret('api-key');
  const result = await api.request(key);
  // key goes out of scope
  return result;
}
```

### ✅ DO: Rotate Secrets Regularly

```bash
# Automate secret rotation
# Example: AWS Secrets Manager

aws secretsmanager rotate-secret \
  --secret-id MyDatabasePassword \
  --rotation-lambda-arn arn:aws:lambda:...
```

### ❌ DON'T: Hardcode Secrets

```javascript
// ❌ NEVER do this!
const API_KEY = 'sk_live_1234567890';
const DB_PASSWORD = 'admin123';

// ✅ Use environment or vault
const API_KEY = process.env.API_KEY;
```

## Build Pipeline Security

### ✅ DO: Use CI/CD Security Checks

```yaml
# .github/workflows/security.yml
name: Security Pipeline
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: npm ci --audit
      
      - name: Audit dependencies
        run: npm audit --audit-level=moderate
      
      - name: Scan packages
        run: npx socket-dev scan
      
      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
      
      - name: SBOM generation
        run: npx @cyclonedx/cyclonedx-npm --output-file sbom.json
      
      - name: Upload SBOM
        uses: actions/upload-artifact@v2
        with:
          name: sbom
          path: sbom.json
```

### ✅ DO: Verify Package Integrity in CI

```bash
# In CI/CD script
#!/bin/bash

# Verify package-lock.json is up to date
npm ci

# Check for modifications
git diff --exit-code package-lock.json

if [ $? -ne 0 ]; then
  echo "❌ package-lock.json modified!"
  exit 1
fi
```

### ✅ DO: Generate Software Bill of Materials (SBOM)

**Why**: Track all dependencies for vulnerability management.

```bash
# Generate SBOM
npx @cyclonedx/cyclonedx-npm --output-file sbom.json

# Or
npx @microsoft/sbom-tool generate -b ./output -bc . -pn MyApp -pv 1.0.0
```

### ✅ DO: Isolate Build Environment

**Why**: Prevent compromised builds from affecting production.

Use a dedicated build user / sandboxed environment and keep build and runtime environments separated.

## Runtime Protection

### ✅ DO: Implement Runtime Monitoring

```javascript
// Monitor module loading
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  // Log all module loads
  console.log('[SECURITY] Loading module:', id);
  
  // Alert on sensitive modules
  const sensitiveModules = ['child_process', 'fs', 'http', 'https', 'net'];
  if (sensitiveModules.includes(id)) {
    console.warn('[ALERT] Sensitive module accessed:', id);
    // Send to SIEM
  }
  
  return originalRequire.apply(this, arguments);
};
```

### ✅ DO: Use Security Headers

```javascript
// Implement security headers
const helmet = require('helmet');
app.use(helmet());

// Or manually:
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

### ✅ DO: Monitor Network Activity

```bash
# Monitor outbound connections
lsof -i -n -P | grep node

# Use network monitoring tools
tcpdump -i any port 443

# Application-level monitoring
# Log all external API calls
```

### ✅ DO: Implement Least Privilege

```javascript
// Run with minimal permissions
// Drop capabilities after startup
process.setgid('appuser');
process.setuid('appuser');

// Restrict file system access
// Use chroot or containers
```

## Incident Response

### ✅ DO: Have an Incident Response Plan

**Steps**:

1. **Detection**: Monitor for compromises
2. **Containment**: Isolate affected systems
3. **Investigation**: Determine scope
4. **Remediation**: Remove malicious code
5. **Recovery**: Restore systems
6. **Lessons Learned**: Update processes

### ✅ DO: Maintain Package Inventory

```bash
# Generate current package list
npm list --json > package-inventory.json

# Track changes
git diff package-inventory.json
```

### ✅ DO: Monitor Security Advisories

**Sources**:
- npm security advisories: https://www.npmjs.com/advisories
- GitHub Security Advisories
- Snyk Vulnerability Database
- OSV (Open Source Vulnerabilities)

**Automation**:
```bash
# GitHub Dependabot (automatic)
# Snyk monitoring
npx snyk monitor

# Custom script
#!/bin/bash
npm audit --json | jq '.vulnerabilities | length'
```

### ✅ DO: Test Incident Response

**Regular drills**:
1. Simulate package compromise
2. Practice detection
3. Test remediation procedures
4. Time response duration
5. Document lessons learned

## Summary Checklist

### Essential (Do Immediately)

- [ ] Use `package-lock.json` and commit it
- [ ] Use `npm ci` instead of `npm install` in CI/CD
- [ ] Run `npm audit` regularly
- [ ] Never commit secrets to repository
- [ ] Review dependencies before installing

### Important (Do Soon)

- [ ] Pin exact versions for critical dependencies
- [ ] Configure scoped registries for private packages
- [ ] Implement automated security scanning in CI/CD
- [ ] Generate and maintain SBOM
- [ ] Create incident response plan

### Advanced (Ongoing)

- [ ] Implement runtime monitoring
- [ ] Use secrets vault (HashiCorp, AWS, etc.)
- [ ] Regular security training for team
- [ ] Contribute to open source security
- [ ] Participate in bug bounty programs

---

**Remember**: Supply chain security is an ongoing process, not a one-time fix!

