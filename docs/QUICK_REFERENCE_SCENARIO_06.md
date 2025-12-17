# 🚀 Quick Reference Card - Scenario 6: Shai-Hulud

A cheat sheet of essential commands for Scenario 6: Shai-Hulud Self-Replicating Attack

## 📋 Initial Setup

```bash
# 1. Navigate to scenario
cd scenarios/06-sha-hulud

# 2. Enable testbench mode
export TESTBENCH_MODE=enabled

# 3. Run scenario setup
./setup.sh
```

## 🎯 Attack Execution

```bash
# 1. Start infrastructure
cd infrastructure
node mock-cdn.js &
node credential-harvester.js &
node github-actions-simulator.js &

# 2. Install compromised package
cd ../../victim-app
npm install ../compromised-package/data-processor

# 3. Check exfiltrated data
curl http://localhost:3001/captured-credentials
curl http://localhost:3002/repo-logs

# 4. Simulate replication
cd ../infrastructure
node replication-simulator.js
```

## 🔍 Forensic Investigation

```bash
# Check postinstall scripts
cat node_modules/data-processor/package.json | grep -A 5 scripts

# Compare versions
diff -ur legitimate-package/data-processor compromised-package/data-processor

# Download and examine bundle.js
curl http://localhost:3000/bundle.js > bundle.js
cat bundle.js

# Check npm install logs
cat ~/.npm/_logs/*-debug.log | grep postinstall
```

## 🛡️ Detection Commands

```bash
# Post-install script monitoring
cd detection-tools
node postinstall-monitor.js

# Credential scanning
node credential-scanner.js ../scenarios/06-sha-hulud/victim-app

# Package integrity checking
npm audit

# Behavioral analysis
# Monitor for:
# - Unusual GitHub repository creation
# - Rapid version bumps
# - Multiple packages updated by same maintainer
```

## 🚨 Incident Response

```bash
# Immediate containment
npm token revoke-all
npm uninstall data-processor
npm cache clean --force

# Block malicious CDN
echo "127.0.0.1 cdn.example.com" >> /etc/hosts

# Credential rotation
npm token revoke-all
npm token create

# Remediation - Pin to safe version
# Edit package.json:
# "data-processor": "1.2.0"  // Last known good version
```

## 📁 Important File Locations

```
scenarios/06-sha-hulud/
├── legitimate-package/data-processor/  # Legitimate version 1.2.0
├── compromised-package/data-processor/ # Compromised version 1.2.1
├── victim-app/                         # Victim application
├── infrastructure/                     # Attack infrastructure
│   ├── mock-cdn.js                     # Serves bundle.js
│   ├── credential-harvester.js        # Receives credentials
│   └── replication-simulator.js      # Simulates replication
└── templates/                          # Attack templates
```

## 🛠️ Useful Commands

```bash
# View package.json with postinstall
cat compromised-package/data-processor/package.json

# Check for postinstall scripts
grep -r "postinstall" node_modules/data-processor/

# Monitor network during install
npm install ../compromised-package/data-processor --verbose

# Check captured credentials
curl http://localhost:3001/captured-credentials | jq

# View replication logs
curl http://localhost:3002/repo-logs
```

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Post-install not executing | Check `npm config get ignore-scripts`, set to false |
| Bundle.js not downloading | Verify mock CDN: `curl http://localhost:3000/bundle.js` |
| No credentials captured | Create test .npmrc, set test env vars, reinstall |
| Infrastructure not running | Check all services: `ps aux | grep -E "mock-cdn|credential"` |

## 📚 Documentation Links

- Full Guide: `docs/ZERO_TO_HERO_SCENARIO_06.md`
- Scenario README: `scenarios/06-sha-hulud/README.md`
- Setup Guide: `docs/SETUP.md`
- Best Practices: `docs/BEST_PRACTICES.md`

## 💡 Key Concepts

- **Self-Replicating**: Attack spreads automatically using stolen credentials
- **Post-Install Scripts**: Execute automatically on `npm install`
- **Credential Harvesting**: Scans for npm tokens, GitHub tokens, cloud credentials
- **Exfiltration**: Uploads stolen data to GitHub repositories
- **Replication**: Uses stolen credentials to compromise more packages
- **Detection**: Monitor postinstall scripts, network traffic, credential access
- **Response**: Immediate credential rotation, package removal, containment

## 🔐 Prevention Checklist

- [ ] Enable 2FA on all npm accounts
- [ ] Restrict post-install scripts: `npm config set ignore-scripts true`
- [ ] Use secret management tools (Vault, Secrets Manager)
- [ ] Never commit credentials to repositories
- [ ] Rotate credentials regularly
- [ ] Use `npm ci` instead of `npm install` in CI/CD
- [ ] Monitor for suspicious package updates
- [ ] Implement automated security scanning

