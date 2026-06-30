# 🚀 Quick Reference Card - Scenario 10: Git Submodule Attack

Use this as your runbook for Scenario 10 when you are teaching live or practicing quickly.





## Table of Contents

<div class="doc-toc">

- [📋 Initial Setup](#📋-initial-setup)
- [🎯 Attack Execution](#🎯-attack-execution)
- [🔍 Detection Commands](#🔍-detection-commands)
- [🛡️ Forensic Investigation](#🛡️-forensic-investigation)
- [🚨 Incident Response](#🚨-incident-response)
- [📁 Important File Locations](#📁-important-file-locations)
- [🛠️ Useful Commands](#🛠️-useful-commands)
- [🆘 Quick Troubleshooting](#🆘-quick-troubleshooting)
- [📚 Documentation Links](#📚-documentation-links)
- [💡 Key Concepts](#💡-key-concepts)
- [🔑 Key Commands Cheat Sheet](#🔑-key-commands-cheat-sheet)

</div>

---
## 📋 Initial Setup

```bash
cd scenarios/10-git-submodule-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

`setup.sh` runs `build-repos.sh` — creates real git repos under `work/` (gitignored).

## 🎯 Attack Execution

```bash
# Terminal A — mock C2
node infrastructure/mock-server.js

# Terminal B — real attack path
bash infrastructure/build-repos.sh   # if work/ was cleared

git -c protocol.file.allow=always clone --recurse-submodules \
    work/awesome-project work/victim-clone

# ⚠️  export must be in the SAME terminal as npm install — env vars don't cross sessions
export TESTBENCH_MODE=enabled && npm --prefix work/victim-clone install

curl -s http://localhost:3000/captured-data
```

## 🔍 Detection Commands

```bash
node detection-tools/submodule-validator.js work/victim-clone
cat work/victim-clone/.gitmodules
cat work/victim-clone/libs/malicious-submodule/postinstall.sh
cat scenarios/10-git-submodule-attack/DETECT.md
```

## 🛡️ Forensic Investigation

```bash
cd work/victim-clone
git submodule status
git log --oneline -5
diff legitimate-repo/.gitmodules compromised-repo/.gitmodules
```

## 🚨 Incident Response

```bash
cd work/victim-clone
git submodule deinit -f libs/malicious-submodule
git rm -f libs/malicious-submodule
# Remove [submodule "malicious-submodule"] from .gitmodules
git commit -m "Remove malicious submodule"
```

## 📁 Important File Locations

```text
scenarios/10-git-submodule-attack/
├── infrastructure/
│   ├── build-repos.sh         # Builds work/awesome-project + work/malicious-lib
│   └── mock-server.js
├── work/                      # Real git repos (gitignored)
│   ├── awesome-project/       # Parent with embedded submodule
│   ├── malicious-lib/         # Attacker submodule source
│   └── victim-clone/          # Learner clone target
├── malicious-submodule/       # Source template for build-repos.sh
└── detection-tools/submodule-validator.js
```

## 🛠️ Useful Commands

```bash
rm -rf work/victim-clone
git -c protocol.file.allow=always clone --recurse-submodules work/awesome-project work/victim-clone
curl -X DELETE http://localhost:3000/captured-data
```

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Clone fails on local submodule | Use `git -c protocol.file.allow=always clone ...` (CVE-2022-39253) |
| No capture | `export TESTBENCH_MODE=enabled`; mock server on :3000; run `npm --prefix work/victim-clone install` |
| work/ missing | `bash infrastructure/build-repos.sh` or re-run `./setup.sh` |
| postinstall not found | Confirm `--recurse-submodules` was used; check `libs/malicious-submodule/postinstall.sh` exists |

## 📚 Documentation Links

- Full Guide: `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_10.md`
- Scenario README: `scenarios/10-git-submodule-attack/README.md`
- Detection runbook: `scenarios/10-git-submodule-attack/DETECT.md`

## 💡 Key Concepts

- **Real git flow**: `clone --recurse-submodules` → `npm install` → submodule script runs
- **.gitmodules**: Defines submodule URL and path — review on every PR
- **protocol.file.allow**: Git hardening blocks local submodules unless explicitly enabled
- **Detection**: Submodule URL allowlist, commit pinning, postinstall script audit
- **Prevention**: Block `file://` submodules in CI; scan submodule content

## 🔑 Key Commands Cheat Sheet

```bash
./setup.sh
node infrastructure/mock-server.js &
git -c protocol.file.allow=always clone --recurse-submodules work/awesome-project work/victim-clone
export TESTBENCH_MODE=enabled && npm --prefix work/victim-clone install
node detection-tools/submodule-validator.js work/victim-clone
```
