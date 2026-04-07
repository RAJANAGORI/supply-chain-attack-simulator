# 🚀 Quick Reference Card - Scenario 8: Package Lock File Manipulation

Use this as your runbook for Scenario 8 when you are teaching live or practicing quickly.

## 📋 Initial Setup

```bash
# 1. Navigate to scenario
cd scenarios/08-package-lock-file-manipulation

# 2. Enable testbench mode
export TESTBENCH_MODE=enabled

# 3. Run scenario setup
./setup.sh
```

## 🎯 Attack Execution

```bash
# 1. Compare legitimate vs compromised apps
cd legitimate-app
cat package.json
cat package-lock.json | head -50

cd ../victim-app
cat package.json  # Still clean!
cat package-lock.json | grep -A 10 "evil-utils"  # Contains malicious package!

# 2. Start mock server
cd ../infrastructure
node mock-server.js &

# 3. Install from manipulated lock file
cd ../victim-app
rm -rf node_modules
npm install  # Installs evil-utils even though it's not in package.json!
# OR use npm ci (trusts lock file completely)
# npm ci

# 4. Run victim application
export TESTBENCH_MODE=enabled
npm start

# 5. Check captured data
curl http://localhost:3000/captured-data
```

## 🔍 Detection Commands

```bash
# Run lock file validator
cd detection-tools
node lock-file-validator.js ../victim-app

# Compare package.json with package-lock.json
cd ../victim-app
node -e "
const pkg = require('./package.json');
const lock = require('./package-lock.json');
const pkgDeps = Object.keys({...pkg.dependencies, ...pkg.devDependencies});
const lockDeps = Object.keys(lock.dependencies || {});
const unexpected = lockDeps.filter(d => !pkgDeps.includes(d) && !d.startsWith('@types/'));
console.log('Unexpected packages in lock file:', unexpected);
"

# Manual comparison
echo "=== package.json dependencies ==="
cat package.json | jq '.dependencies'

echo "=== package-lock.json packages ==="
cat package-lock.json | jq '.dependencies | keys'

# Check for suspicious packages
cat package-lock.json | grep -i "evil\|malicious\|hack"

# Verify package integrity
npm audit
```

## 🛡️ Forensic Investigation

```bash
# Git history analysis (if using git)
git log -p package-lock.json | head -100
git diff HEAD~1 package-lock.json | grep -A 10 "evil-utils"

# Check when lock file was modified
git log --oneline package-lock.json
git show HEAD:package-lock.json | grep -A 10 "evil-utils" || echo "Not in current version"

# Extract all packages from lock file
cat package-lock.json | jq '.dependencies | keys'

# Check specific malicious package
cat package-lock.json | jq '.dependencies["evil-utils"]'

# Compare lock files
diff legitimate-app/package-lock.json victim-app/package-lock.json
```

## 🚨 Incident Response

```bash
# Immediate containment
npm uninstall evil-utils  # If installed
rm -rf node_modules

# Restore lock file from git (if available)
git checkout HEAD -- package-lock.json

# OR regenerate from package.json
rm package-lock.json
npm install

# Verify new lock file is clean
node ../detection-tools/lock-file-validator.js .

# Clear npm cache
npm cache clean --force

# Verify integrity
npm audit
```

## 📁 Important File Locations

```text
scenarios/08-package-lock-file-manipulation/
├── legitimate-app/          # Clean app (baseline)
├── victim-app/             # App with manipulated lock file (packages installed)
├── compromised-app/        # Pre-compromised state (lock file manipulated, packages not installed)
├── malicious-packages/
│   └── evil-utils/         # Malicious package injected via lock file
├── infrastructure/
│   └── mock-server.js      # Mock attacker server
├── detection-tools/
│   └── lock-file-validator.js  # Lock file validation tool
└── templates/
    └── manipulate-lock-file.js  # Lock file manipulation script
```

## 🛠️ Useful Commands

```bash
# Check installed packages
npm list --depth=0

# Check if malicious package is installed
node -e "try { require('evil-utils'); console.log('⚠️  evil-utils is installed!'); } catch(e) { console.log('✅ Not installed'); }"

# View lock file structure
cat package-lock.json | jq '.lockfileVersion'
cat package-lock.json | jq '.dependencies | keys | length'

# Check lock file checksum
sha256sum package-lock.json

# Compare three app states
diff legitimate-app/package-lock.json victim-app/package-lock.json
diff legitimate-app/package-lock.json compromised-app/package-lock.json

# Check for postinstall scripts in lock file packages
node -e "
const lock = require('./package-lock.json');
Object.keys(lock.dependencies || {}).forEach(pkg => {
  const nodeModulesPath = './node_modules/' + pkg + '/package.json';
  try {
    const pkgJson = require(nodeModulesPath);
    if (pkgJson.scripts && (pkgJson.scripts.postinstall || pkgJson.scripts.install)) {
      console.log(pkg + ' has postinstall script');
    }
  } catch(e) {}
});
"
```

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Lock file not found | Generate one: `npm install` |
| Validation shows no issues | Check if packages are installed: `npm list` |
| evil-utils not installing | Ensure lock file is manipulated: `cat package-lock.json \| grep evil-utils` |
| npm ci fails | Check lock file format, try `npm install` instead |
| Cannot compare lock files | Use `jq` for JSON parsing or `diff` for text comparison |

## 📚 Documentation Links

If you need more context than the commands above, these are the right deep links.

- Full Guide: `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_08.md`
- Scenario README: `scenarios/08-package-lock-file-manipulation/README.md`
- Setup Guide: `documentation/SETUP.md`
- Best Practices: `documentation/BEST_PRACTICES.md`

## 💡 Key Concepts

- **Lock File**: Locks exact versions of all dependencies (package-lock.json)
- **Trust**: Package managers trust lock files completely
- **npm ci**: Uses lock file exclusively, ignores package.json
- **Hidden Attack**: package.json appears clean, lock file contains malicious package
- **CI/CD Risk**: Build systems use npm ci, trusting the lock file
- **Detection**: Compare package.json with package-lock.json
- **Prevention**: Lock file validation, git hooks, CI/CD checks, checksums

## 🔑 Key Commands Cheat Sheet

```bash
# Setup
cd scenarios/08-package-lock-file-manipulation && export TESTBENCH_MODE=enabled && ./setup.sh

# Attack
node infrastructure/mock-server.js &
cd victim-app && npm install  # Installs from manipulated lock file

# Detection
node detection-tools/lock-file-validator.js victim-app
node -e "const pkg=require('./package.json'); const lock=require('./package-lock.json'); console.log('Unexpected:', Object.keys(lock.dependencies||{}).filter(d=>!Object.keys({...pkg.dependencies, ...pkg.devDependencies}).includes(d)));"

# Response
rm package-lock.json && npm install  # Regenerate clean lock file
node detection-tools/lock-file-validator.js .  # Verify
```

## 🎯 Three App States Explained

1. **legitimate-app/**: Clean baseline - no manipulation
2. **victim-app/**: Lock file manipulated, packages installed, attack active
3. **compromised-app/**: Lock file pre-manipulated, ready to demonstrate attack


