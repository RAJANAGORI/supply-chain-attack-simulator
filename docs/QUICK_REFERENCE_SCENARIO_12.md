# 🚀 Quick Reference Card - Scenario 12: Workspace/Monorepo Attack

A cheat sheet of essential commands for Scenario 12: Workspace/Monorepo Attack

## 📋 Initial Setup

```bash
# 1. Navigate to scenario
cd scenarios/12-workspace-monorepo-attack

# 2. Enable testbench mode
export TESTBENCH_MODE=enabled

# 3. Run scenario setup
./setup.sh
```

## 🎯 Attack Execution

```bash
# 1. Examine legitimate workspace packages
cd legitimate-packages/utils
cat package.json
cat index.js

cd ../api
cat package.json
cat index.js

cd ../auth
cat package.json
cat index.js

# 2. Examine compromised workspace package
cd ../../compromised-package/utils
cat package.json
cat postinstall.js

# 3. Start mock server
cd ../../infrastructure
node mock-server.js &

# 4. Set up workspace with legitimate packages
cd ..
cp -r legitimate-packages/* packages/
npm install

# 5. Replace with compromised package
cp -r compromised-package/utils packages/utils
npm install  # Triggers postinstall script

# 6. Run victim application
cd victim-app
export TESTBENCH_MODE=enabled
npm install
npm start

# 7. Check captured data
curl http://localhost:3000/captured-data
```

## 🔍 Detection Commands

```bash
# Run workspace scanner
cd detection-tools
node workspace-scanner.js ..

# View workspace configuration
cd ..
cat package.json | grep -A 5 "workspaces"

# List all workspace packages
ls -la packages/

# Check workspace dependencies
cd packages/utils
cat package.json | grep -A 10 "dependencies"

# Check for postinstall scripts in workspace packages
find packages -name "package.json" -exec grep -l "postinstall" {} \;

# View workspace dependency tree
npm ls --workspaces

# Check specific workspace package
npm ls @devcorp/utils --workspaces
```

## 🛡️ Forensic Investigation

```bash
# Build complete workspace tree
npm ls --workspaces --all

# Check workspace package structure
cat packages/utils/package.json
cat packages/utils/postinstall.js 2>/dev/null || echo "No postinstall"

# Check workspace package version
npm list @devcorp/utils --workspaces

# Compare legitimate vs compromised
diff -ur legitimate-packages/utils compromised-package/utils

# Check workspace root files
cat package.json
ls -la packages/

# View captured data
cat infrastructure/captured-data.json
```

## 🚨 Incident Response

```bash
# Immediate containment
rm -rf packages/utils
npm cache clean --force

# Restore legitimate package
cp -r legitimate-packages/utils packages/utils

# Reinstall workspace
rm -rf node_modules package-lock.json
npm install

# Verify clean state
npm ls --workspaces
node detection-tools/workspace-scanner.js .
```

## 📁 Important File Locations

```
scenarios/12-workspace-monorepo-attack/
├── package.json                    # Workspace root configuration
├── legitimate-packages/
│   ├── utils/                     # Legitimate workspace package
│   ├── api/                       # Legitimate workspace package
│   └── auth/                      # Legitimate workspace package
├── compromised-package/
│   └── utils/                     # Compromised workspace package
├── packages/                      # Active workspace packages
├── victim-app/                    # Victim application
├── infrastructure/
│   └── mock-server.js             # Mock attacker server
├── detection-tools/
│   └── workspace-scanner.js       # Workspace scanner
└── templates/                     # Attack templates
```

## 🛠️ Useful Commands

```bash
# View workspace configuration
cat package.json | grep -A 10 "workspaces"

# List workspace packages
npm ls --workspaces --depth=0

# Check workspace dependencies
npm ls --workspaces --all

# Check for postinstall scripts
find packages -name "package.json" -exec grep -A 5 "scripts" {} \;

# Install workspace
npm install

# Run workspace package script
npm run --workspace=packages/utils test

# Check workspace package metadata
npm list @devcorp/utils --workspaces

# Verify workspace integrity
npm audit --workspaces
```

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot find workspace packages | Check packages directory: `ls packages/` |
| Postinstall not executing | Verify TESTBENCH_MODE is enabled |
| No captured data | Check mock server is running: `curl http://localhost:3000/captured-data` |
| Workspace not recognized | Check package.json has "workspaces" field |
| Package not found | Verify workspace protocol: `workspace:*` in dependencies |
| Scanner shows no packages | Check packages directory exists and has packages |

## 📚 Documentation Links

- Full Guide: `docs/ZERO_TO_HERO_SCENARIO_12.md`
- Scenario README: `scenarios/12-workspace-monorepo-attack/README.md`
- Setup Guide: `docs/SETUP.md`
- Best Practices: `docs/BEST_PRACTICES.md`

## 💡 Key Concepts

- **Workspace**: Multiple packages in one repository (monorepo)
- **Workspace Protocol**: `workspace:*` for workspace dependencies
- **Shared Access**: Workspace packages can access each other
- **Wide Impact**: One compromised package affects entire workspace
- **Postinstall Execution**: Runs automatically during workspace install
- **Detection**: Audit all workspace packages, monitor postinstall scripts
- **Prevention**: Workspace access control, regular audits, postinstall monitoring

## 🔑 Key Commands Cheat Sheet

```bash
# Setup
cd scenarios/12-workspace-monorepo-attack && export TESTBENCH_MODE=enabled && ./setup.sh

# Attack
node infrastructure/mock-server.js &
cp -r legitimate-packages/* packages/ && npm install
cp -r compromised-package/utils packages/utils && npm install

# Detection
node detection-tools/workspace-scanner.js .
npm ls --workspaces --all
find packages -name "postinstall.js"

# Response
rm -rf packages/utils && cp -r legitimate-packages/utils packages/utils && npm install
```
