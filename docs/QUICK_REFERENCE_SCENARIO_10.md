# 🚀 Quick Reference Card - Scenario 10: Git Submodule Attack

A cheat sheet of essential commands for Scenario 10: Git Submodule Attack

## 📋 Initial Setup

```bash
# 1. Navigate to scenario
cd scenarios/10-git-submodule-attack

# 2. Enable testbench mode
export TESTBENCH_MODE=enabled

# 3. Run scenario setup
./setup.sh
```

## 🎯 Attack Execution

```bash
# 1. Compare legitimate vs compromised repos
cd legitimate-repo
cat .gitmodules

cd ../compromised-repo
cat .gitmodules  # Contains malicious submodule

# 2. Start mock server
cd ../infrastructure
node mock-server.js &

# 3. Simulate submodule execution
cd ../malicious-submodule
export TESTBENCH_MODE=enabled
bash postinstall.sh

# 4. Check captured data
curl http://localhost:3000/captured-data
```

## 🔍 Detection Commands

```bash
# Run submodule validator
cd detection-tools
node submodule-validator.js ../compromised-repo

# Check .gitmodules file
cat .gitmodules

# List submodules
git submodule status

# Check submodule URLs
cat .gitmodules | grep "url ="

# Analyze submodule content
ls -la libs/malicious-submodule/
cat libs/malicious-submodule/postinstall.sh
```

## 🛡️ Forensic Investigation

```bash
# Compare .gitmodules files
diff legitimate-repo/.gitmodules compromised-repo/.gitmodules

# Check git history for .gitmodules changes
git log -p .gitmodules

# Analyze submodule content
cd compromised-repo
find libs -name "*.sh" -o -name "*.js" | xargs grep -l "curl\|wget"

# Check submodule URLs
cat .gitmodules | grep -A 2 "malicious"
```

## 🚨 Incident Response

```bash
# Immediate containment
# Remove malicious submodule from .gitmodules
# Remove submodule directory
rm -rf libs/malicious-submodule

# Update .gitmodules
# Remove the [submodule "malicious-submodule"] section

# Clean git cache
git rm --cached libs/malicious-submodule
git submodule deinit libs/malicious-submodule

# Commit changes
git add .gitmodules
git commit -m "Remove malicious submodule"
```

## 📁 Important File Locations

```
scenarios/10-git-submodule-attack/
├── legitimate-repo/              # Clean repository
├── compromised-repo/             # Repository with malicious submodule
├── malicious-submodule/          # Malicious submodule content
├── victim-app/                   # Victim application
├── infrastructure/
│   └── mock-server.js            # Mock attacker server
└── detection-tools/
    └── submodule-validator.js    # Submodule validation tool
```

## 🛠️ Useful Commands

```bash
# List all submodules
git submodule status

# Initialize submodules (WARNING: executes malicious code if compromised)
git submodule update --init

# Check submodule URLs
cat .gitmodules | grep "url ="

# Validate submodule integrity
node detection-tools/submodule-validator.js .

# Review submodule additions in git history
git log -p .gitmodules
```

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot find .gitmodules | Repository may not use submodules |
| Submodule validator shows no issues | Check if submodules are actually initialized |
| Submodule execution not triggering | Ensure TESTBENCH_MODE is enabled |
| Cannot remove submodule | Use git rm --cached and remove from .gitmodules |

## 📚 Documentation Links

- Full Guide: `docs/ZERO_TO_HERO_SCENARIO_10.md`
- Scenario README: `scenarios/10-git-submodule-attack/README.md`
- Setup Guide: `docs/SETUP.md`
- Best Practices: `docs/BEST_PRACTICES.md`

## 💡 Key Concepts

- **Git Submodules**: Include other repositories in your project
- **.gitmodules File**: Configuration file defining submodules
- **Automatic Execution**: Submodules can execute code during clone/update
- **Hidden Attack**: Malicious submodules can be overlooked in reviews
- **Detection**: Review .gitmodules, validate URLs, check submodule content
- **Prevention**: Review submodule additions, validate URLs, pin to commits

## 🔑 Key Commands Cheat Sheet

```bash
# Setup
cd scenarios/10-git-submodule-attack && export TESTBENCH_MODE=enabled && ./setup.sh

# Attack
node infrastructure/mock-server.js &
cd malicious-submodule && bash postinstall.sh

# Detection
node detection-tools/submodule-validator.js compromised-repo
cat .gitmodules

# Response
git rm --cached libs/malicious-submodule
# Edit .gitmodules to remove malicious submodule
git commit -m "Remove malicious submodule"
```

