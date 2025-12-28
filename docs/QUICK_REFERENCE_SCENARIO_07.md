# 🚀 Quick Reference Card - Scenario 7: Transitive Dependency Attack

A cheat sheet of essential commands for Scenario 7: Transitive Dependency Attack

## 📋 Initial Setup

```bash
# 1. Navigate to scenario
cd scenarios/07-transitive-dependency

# 2. Enable testbench mode
export TESTBENCH_MODE=enabled

# 3. Run scenario setup
./setup.sh
```

## 🎯 Attack Execution

```bash
# 1. Examine legitimate packages
cd legitimate-packages/web-utils
cat package.json
cat index.js

cd ../data-processor
cat package.json
cat index.js

# 2. Examine compromised package
cd ../../compromised-packages/data-processor
cat package.json
cat postinstall.js

# 3. Start mock server
cd ../../infrastructure
node mock-server.js &

# 4. Install compromised transitive dependency
cd ../victim-app
rm -rf node_modules package-lock.json
npm install
# Replace legitimate data-processor with compromised version
cp -r ../compromised-packages/data-processor node_modules/data-processor
npm install  # Triggers postinstall script

# 5. Run victim application
export TESTBENCH_MODE=enabled
npm start

# 6. Check captured data
curl http://localhost:3000/captured-data
```

## 🔍 Detection Commands

```bash
# Run dependency tree scanner
cd detection-tools
node dependency-tree-scanner.js ../victim-app

# View dependency tree
cd ../victim-app
npm ls

# View all dependencies (including transitive)
npm ls --all

# Check for postinstall scripts in transitive deps
find node_modules -name "package.json" -exec grep -l "postinstall" {} \;

# Compare package.json with lock file
node -e "
const pkg = require('./package.json');
const lock = require('./package-lock.json');
const pkgDeps = Object.keys({...pkg.dependencies, ...pkg.devDependencies});
const lockDeps = Object.keys(lock.dependencies || {});
const transitive = lockDeps.filter(d => !pkgDeps.includes(d));
console.log('Transitive dependencies:', transitive);
"

# Export dependency tree
npm ls --json > dependency-tree.json
```

## 🛡️ Forensic Investigation

```bash
# Build complete dependency tree
npm ls --depth=10

# Check specific transitive dependency
npm ls data-processor

# Analyze package structure
cat node_modules/data-processor/package.json
cat node_modules/data-processor/postinstall.js 2>/dev/null || echo "No postinstall"

# Check package version
npm list data-processor

# Compare legitimate vs compromised
diff -ur ../legitimate-packages/data-processor ../compromised-packages/data-processor
```

## 🚨 Incident Response

```bash
# Immediate containment
npm uninstall web-utils
npm cache clean --force

# Remove compromised transitive dependency
rm -rf node_modules/data-processor

# Regenerate lock file
rm package-lock.json
npm install

# Verify clean state
npm ls
node ../detection-tools/dependency-tree-scanner.js .
```

## 📁 Important File Locations

```
scenarios/07-transitive-dependency/
├── legitimate-packages/
│   ├── web-utils/              # Parent package (direct dependency)
│   └── data-processor/         # Legitimate transitive dependency
├── compromised-packages/
│   └── data-processor/         # Compromised transitive dependency
├── victim-app/                 # Victim application
├── infrastructure/
│   └── mock-server.js          # Mock attacker server
├── detection-tools/
│   └── dependency-tree-scanner.js  # Dependency tree scanner
└── templates/                   # Attack templates
```

## 🛠️ Useful Commands

```bash
# View dependency tree depth
npm ls --depth=0  # Direct dependencies only
npm ls --depth=5  # Include transitive dependencies

# Check for specific package in tree
npm ls data-processor

# List all packages
npm list --depth=10 | grep -E "└|├"

# Check package metadata
npm view data-processor versions

# Verify package integrity
npm audit
npm audit --production

# Check package scripts
cat node_modules/data-processor/package.json | grep -A 10 "scripts"
```

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot find data-processor | Check node_modules: `ls node_modules/` |
| Postinstall not executing | Verify TESTBENCH_MODE is enabled |
| No captured data | Check mock server is running: `curl http://localhost:3000/captured-data` |
| Dependency tree empty | Run `npm install` first |
| Scanner shows no transitive deps | Check depth: `npm ls --depth=5` |

## 📚 Documentation Links

- Full Guide: `docs/ZERO_TO_HERO_SCENARIO_07.md`
- Scenario README: `scenarios/07-transitive-dependency/README.md`
- Setup Guide: `docs/SETUP.md`
- Best Practices: `docs/BEST_PRACTICES.md`

## 💡 Key Concepts

- **Transitive Dependency**: Dependency of a dependency (not directly in package.json)
- **Dependency Tree**: Complete hierarchy of all dependencies
- **Hidden Attack**: Victim never directly installed malicious package
- **Wide Impact**: One compromised package affects many projects
- **Detection**: Audit entire dependency tree, not just direct deps
- **Prevention**: Dependency pinning, lock files, automated scanning, SBOMs

## 🔑 Key Commands Cheat Sheet

```bash
# Setup
cd scenarios/07-transitive-dependency && export TESTBENCH_MODE=enabled && ./setup.sh

# Attack
node infrastructure/mock-server.js &
cd victim-app && npm install && cp -r ../compromised-packages/data-processor node_modules/data-processor && npm install

# Detection
node detection-tools/dependency-tree-scanner.js victim-app
npm ls --all
npm audit

# Response
npm uninstall web-utils && npm cache clean --force && rm -rf node_modules package-lock.json && npm install
```

