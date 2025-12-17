# 🚀 Quick Reference Card - Scenario 5: Build System Compromise

A cheat sheet of essential commands for Scenario 5: Build System Compromise

## 📋 Initial Setup

```bash
# 1. Navigate to scenario
cd scenarios/05-build-compromise

# 2. Enable testbench mode
export TESTBENCH_MODE=enabled

# 3. Run scenario setup
./setup.sh
```

## 🎯 Attack Execution

```bash
# 1. Start mock server (if not using Docker)
node ../01-typosquatting/infrastructure/mock-server.js &

# 2. Run legitimate build
cd legitimate-build
npm run build

# 3. Run compromised build
cd ../compromised-build
export TESTBENCH_MODE=enabled
export AWS_ACCESS_KEY_ID=test-key-12345
export AWS_SECRET_ACCESS_KEY=test-secret-67890
export DATABASE_PASSWORD=super-secret-password
npm run build

# 4. Check captured data
curl http://localhost:3000/captured-data

# 5. Use compromised artifacts
cp dist/* ../victim-app/dist/
cd ../victim-app
export TESTBENCH_MODE=enabled
npm start
```

## 🔍 Detection Commands

```bash
# Compare build scripts
diff legitimate-build/build.sh compromised-build/build.sh

# Check for suspicious commands
grep -n "curl\|wget\|http\|eval" compromised-build/build.sh

# Compare artifacts
diff legitimate-build/dist/ compromised-build/dist/

# Check for suspicious code in artifacts
grep -r "http\|process.env\|eval" compromised-build/dist/

# Run secret monitor
cd detection-tools
node secret-monitor.js ../compromised-build
```

## 🛡️ Prevention Commands

```bash
# Build script integrity
sha256sum build.sh > build.sh.sha256
sha256sum -c build.sh.sha256

# Artifact verification
sha256sum dist/* > artifacts.sha256

# Build isolation (Docker)
docker build -t build-image .
docker run --rm build-image npm run build

# Code signing
gpg --sign dist/app.js
gpg --verify dist/app.js.asc
```

## 📁 Important File Locations

```
scenarios/05-build-compromise/
├── legitimate-build/          # Legitimate build configuration
│   ├── build.sh               # Clean build script
│   └── dist/                  # Clean artifacts
├── compromised-build/          # Compromised build configuration
│   ├── build.sh               # Malicious build script
│   └── dist/                  # Compromised artifacts
├── victim-app/                 # Victim application
└── detection-tools/            # Detection scripts
```

## 🛠️ Useful Commands

```bash
# View build scripts
cat legitimate-build/build.sh
cat compromised-build/build.sh

# Check build artifacts
ls -la legitimate-build/dist/
ls -la compromised-build/dist/

# View artifact contents
cat legitimate-build/dist/app.js
cat compromised-build/dist/app.js

# Monitor build process
npm run build --verbose
```

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Build script not executable | `chmod +x build.sh` |
| No data captured | Check TESTBENCH_MODE, verify mock server, check env vars |
| Artifacts not created | Check build script, verify permissions |

## 📚 Documentation Links

- Full Guide: `docs/ZERO_TO_HERO_SCENARIO_05.md`
- Scenario README: `scenarios/05-build-compromise/README.md`
- Setup Guide: `docs/SETUP.md`
- Best Practices: `docs/BEST_PRACTICES.md`

## 💡 Key Concepts

- **Build System Compromise**: CI/CD pipeline attacks
- **Build Script Injection**: Malicious code in build scripts
- **Secret Theft**: Harvesting build-time environment variables
- **Artifact Poisoning**: Malicious code in compiled artifacts
- **Detection**: Monitor build scripts, artifacts, secret access
- **Prevention**: Build script integrity, artifact verification, secret management, build isolation

