# Vulnerable Node.js Application

This is an intentionally vulnerable Node.js application designed to demonstrate supply chain attack risks.

## 🎯 Purpose

This application serves as a target for supply chain attack scenarios. It contains common vulnerabilities found in real-world applications that can be exploited through compromised dependencies.

## 🔓 Vulnerabilities

### 1. Dependency Management
- No `package-lock.json` enforcement
- Use of `npm install` instead of `npm ci`
- Outdated dependencies
- No automated security scanning

### 2. Secrets Management
- Hardcoded default secrets
- All secrets accessible via `process.env`
- No encryption of sensitive data
- No secrets vault integration

### 3. Input Validation
- No input sanitization
- Trusting user-provided data
- Vulnerable validation libraries

### 4. Configuration
- Sensitive data exposed via API
- No security headers
- Debug information leakage

## 🚀 Usage

### Setup

```bash
cd vulnerable-apps/nodejs-app

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start the application
npm start
```

### Access

- Application: http://localhost:8000
- Config API: http://localhost:8000/api/config
- Health Check: http://localhost:8000/health

## 🧪 Attack Scenarios

### Scenario: Install Malicious Package

1. **Install a compromised validation library**:
   ```bash
   npm install ../../scenarios/03-compromised-package/compromised-package/secure-validator
   ```

2. **Use it in the application** (add to `server.js`):
   ```javascript
   const validator = require('secure-validator');
   
   app.post('/api/validate', (req, res) => {
     const result = validator.validateEmail(req.body.email);
     // Email is now exfiltrated by malicious package!
   });
   ```

3. **Check exfiltrated data**:
   ```bash
   curl http://localhost:3000/captured-data
   ```

### What Gets Compromised?

When a malicious package is installed, it can access:

- ✗ All environment variables (API keys, secrets, passwords)
- ✗ Database connection strings
- ✗ AWS credentials
- ✗ User input data (emails, passwords)
- ✗ API tokens
- ✗ Application configuration

## 🛡️ Defense Exercises

### Exercise 1: Implement Security Scanning

Add to `package.json`:
```json
{
  "scripts": {
    "security-scan": "npm audit",
    "preinstall": "node scripts/verify-packages.js"
  }
}
```

### Exercise 2: Use Package Lock

```bash
# Generate package-lock.json
npm install

# In CI/CD, use:
npm ci --audit
```

### Exercise 3: Secrets Management

```bash
# Install secrets manager
npm install @hashicorp/vault-client

# Never use process.env directly
# Fetch from vault at runtime
```

### Exercise 4: Input Validation

```bash
# Install trusted validation library
npm install validator@latest

# Always validate and sanitize input
```

### Exercise 5: Runtime Monitoring

Implement package monitoring:
```javascript
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  // Log all requires
  console.log('[MONITOR] Loading:', id);
  
  // Block suspicious modules
  if (id === 'child_process') {
    console.warn('[ALERT] Attempt to load child_process');
  }
  
  return originalRequire.apply(this, arguments);
};
```

## 📊 Metrics

After running attack scenarios, analyze:

- Number of packages with access to secrets
- Data exfiltration attempts detected
- Time to detect malicious behavior
- Impact of each vulnerability

## 🔍 Investigation

### Check What Packages Are Installed

```bash
npm list --depth=0
npm list --all  # Include transitive dependencies
```

### Scan for Vulnerabilities

```bash
npm audit
npm audit fix

# Or use external tools
npx snyk test
npx socket-dev scan
```

### Monitor Network Activity

```bash
../../detection-tools/network-monitor.sh
```

## ⚠️ Safety Reminders

- This is for **educational purposes only**
- Use **only in isolated environments**
- Never deploy to production
- Always set `TESTBENCH_MODE=enabled`

## 📚 Learning Objectives

After using this application, you should understand:

- How malicious packages access sensitive data
- The importance of package lock files
- Secrets management best practices
- Input validation necessity
- Runtime monitoring techniques
- Supply chain defense strategies

## 🔗 Related Materials

- [Main README](../../README.md)
- [Scenario 3: Compromised Package](../../scenarios/03-compromised-package/README.md)
- [Detection Tools](../../detection-tools/)

---

**Remember**: Real applications have these same vulnerabilities. Secure your supply chain!

