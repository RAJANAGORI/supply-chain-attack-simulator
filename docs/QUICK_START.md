# Quick Start Guide

Get up and running with the Supply Chain Attack Testbench in 5 minutes!

## 🚀 Fast Track Installation

### 1. Prerequisites Check

```bash
node --version   # Should be v16+
npm --version    # Should be v7+
docker --version # Optional but recommended
```

If missing, install from [nodejs.org](https://nodejs.org) and [docker.com](https://docker.com).

### 2. Clone and Setup

```bash
# Clone repository
git clone <repository-url>
cd testbench

# Run setup
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 3. Enable Testbench Mode

```bash
export TESTBENCH_MODE=enabled
```

### 4. Start Services

```bash
# With Docker (recommended)
cd docker && docker-compose up -d

# OR manually
node scenarios/01-typosquatting/infrastructure/mock-server.js &
```

### 5. Open Dashboard

Visit http://localhost:8080 in your browser.

## 🎯 Your First Attack Scenario

### Scenario 1: Typosquatting (15 minutes)

#### Step 1: Navigate to Scenario

```bash
cd scenarios/01-typosquatting
./setup.sh
```

#### Step 2: Review the Attack

```bash
# See the legitimate package
cat legitimate/requests-lib/index.js

# See the malicious package template
cat templates/malicious-package-template.js
```

#### Step 3: Create Malicious Package

```bash
# Copy template to malicious package
mkdir -p malicious-packages/request-lib
cp templates/malicious-package-template.js malicious-packages/request-lib/index.js

# Create package.json
cat > malicious-packages/request-lib/package.json << 'EOF'
{
  "name": "request-lib",
  "version": "1.0.0",
  "description": "HTTP request library [MALICIOUS - EDUCATIONAL]",
  "main": "index.js"
}
EOF
```

#### Step 4: Run Victim Application

```bash
cd victim-app

# Install the typosquatted package (simulating typo)
npm install ../malicious-packages/request-lib

# Run the application
export TESTBENCH_MODE=enabled
npm start
```

#### Step 5: View Exfiltrated Data

```bash
# Check what data was captured
curl http://localhost:3000/captured-data

# Or view in dashboard
# http://localhost:8080
```

🎉 **Congratulations!** You've completed your first supply chain attack!

## 📊 What You Just Did

1. ✅ Created a malicious package that mimics a legitimate one
2. ✅ Simulated a developer typo (`request-lib` vs `requests-lib`)
3. ✅ Exfiltrated data to an attacker server
4. ✅ Observed how the attack remains undetected

## 🔍 Now Try Detection

### Scan for the Malicious Package

```bash
cd ..
node ../../detection-tools/package-scanner.js victim-app
```

The scanner should detect:
- Suspicious network requests
- Data exfiltration patterns
- Anomalous behavior

## 🎓 What's Next?

### Continue Learning

1. **Scenario 2**: [Dependency Confusion](../scenarios/02-dependency-confusion/README.md)
   - Learn about public vs private package attacks
   - Exploiting package resolution mechanisms

2. **Scenario 3**: [Compromised Package](../scenarios/03-compromised-package/README.md)
   - Account takeover simulation
   - Forensic investigation
   - Incident response

3. **Advanced Topics**:
   - Build pipeline compromise
   - Transitive dependency attacks
   - Supply chain defense strategies

### Explore Tools

- **Package Scanner**: `detection-tools/package-scanner.js`
- **Network Monitor**: `detection-tools/network-monitor.sh`
- **Dashboard**: http://localhost:8080

### Read Documentation

- [Complete Setup Guide](SETUP.md)
- [Best Practices](BEST_PRACTICES.md)
- [Detection Tools Guide](DETECTION_TOOLS.md)

## 💡 Pro Tips

### Tip 1: Use the Dashboard

The web dashboard at http://localhost:8080 provides a visual interface to:
- View all captured attack data
- Monitor in real-time
- Export data for analysis

### Tip 2: Clean Up Between Scenarios

```bash
# Clear captured data
curl -X DELETE http://localhost:3000/captured-data

# Or use dashboard "Clear All Data" button
```

### Tip 3: Reset Environment

```bash
# Stop all services
cd docker && docker-compose down

# Clear node_modules
find . -name "node_modules" -type d -exec rm -rf {} +

# Restart fresh
docker-compose up -d
```

### Tip 4: Save Your Work

```bash
# Export captured data from dashboard
curl http://localhost:3000/captured-data > my-analysis.json
```

## 🆘 Quick Troubleshooting

### Mock Server Not Running?

```bash
# Check if running
curl http://localhost:3000/captured-data

# If not, start it
node scenarios/01-typosquatting/infrastructure/mock-server.js &
```

### Dashboard Not Loading?

```bash
# Check if running
curl http://localhost:8080

# If not, start it
cd docker/dashboard
npm install
node server.js &
```

### TESTBENCH_MODE Not Set?

```bash
# Set for current session
export TESTBENCH_MODE=enabled

# Set permanently
echo 'export TESTBENCH_MODE=enabled' >> ~/.bashrc
source ~/.bashrc
```

## 📚 Learning Resources

### Understand the Attacks

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [npm Security Best Practices](https://docs.npmjs.com/security)
- [Supply Chain Security Guide](https://www.cisa.gov/supply-chain)

### Real-World Cases

- event-stream incident (2018)
- ua-parser-js compromise (2021)
- colors.js sabotage (2022)

### Tools and Frameworks

- [Socket.dev](https://socket.dev) - Package security
- [Snyk](https://snyk.io) - Vulnerability scanning
- [Dependabot](https://github.com/dependabot) - Automated updates

## 🎯 Challenge Yourself

### Beginner Challenges

1. Modify the exfiltration target
2. Add more data to capture
3. Create a different typosquatted package name

### Intermediate Challenges

1. Hide the malicious code better (obfuscation)
2. Make it only activate in production
3. Add a time-delayed trigger

### Advanced Challenges

1. Create a multi-stage attack
2. Implement persistence mechanisms
3. Build a complete detection system

## ⚠️ Remember

This is a **learning environment**:

- ✅ Explore and experiment
- ✅ Break things and learn
- ✅ Try different attack vectors
- ❌ Never use on real systems
- ❌ Never deploy malicious code
- ❌ Always use TESTBENCH_MODE

---

**Now go explore and learn!** 🚀🔐

For detailed instructions, see the [Complete Setup Guide](SETUP.md).

