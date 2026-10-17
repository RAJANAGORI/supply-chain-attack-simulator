# Quick Reference Card - Scenario 6: Shai-Hulud

Commands for the token-theft worm. One `npm install` harvests tokens, then republishes every `@victim-org/*` package in the lockfile. All of it stays on `127.0.0.1`.

## Table of Contents

<div class="doc-toc">

- [Initial Setup](#initial-setup)
- [Attack Execution](#attack-execution)
- [Forensic Investigation](#forensic-investigation)
- [Detection Commands](#detection-commands)
- [Incident Response](#incident-response)
- [Important File Locations](#important-file-locations)
- [Useful Commands](#useful-commands)
- [Quick Troubleshooting](#quick-troubleshooting)
- [Documentation Links](#documentation-links)
- [Key Concepts](#key-concepts)
- [Prevention Checklist](#prevention-checklist)

</div>

---

## Initial Setup

```bash
cd scenarios/06-sha-hulud
export TESTBENCH_MODE=enabled
./setup.sh
```

## Attack Execution

```bash
# Terminal A, from scenarios/06-sha-hulud/infrastructure
node credential-harvester.js &
node github-actions-simulator.js &
node mock-registry.js &

# Terminal B
cd ../victim-app
export TESTBENCH_MODE=enabled
npm install
```

`postinstall.js` posts the harvest to `:3001/collect` first. Then it reads `package-lock.json` and, for each `@victim-org/*` package, posts a publish to `:3003/publish` and a backdoor PR to `:3002/backdoor-pr`.

## Forensic Investigation

```bash
curl -s http://127.0.0.1:3001/captured-credentials
curl -s http://127.0.0.1:3003/published-packages
curl -s http://127.0.0.1:3002/backdoor-prs

# From scenarios/06-sha-hulud
node detection-tools/worm-status.js victim-app
```

You want `token_harvest` on the harvester, then `malicious_publish` for `victim-utils`, `victim-api`, `victim-logger`, and `victim-auth`. Same four names on the PR log. The package folders under `victim-app/packages/` stay clean. The infection is the publish record, not a rewritten file on disk.

## Detection Commands

```bash
# From scenarios/06-sha-hulud
node detection-tools/postinstall-monitor.js victim-app/node_modules/shai-hulud
node detection-tools/credential-scanner.js victim-app

grep -R "postinstall" victim-app/node_modules/shai-hulud/package.json
grep -R "@victim-org/" victim-app/package-lock.json
```

## Incident Response

```bash
npm uninstall shai-hulud
npm cache clean --force
```

On a real machine you would also revoke the npm token and the GitHub token, freeze publishes for `@victim-org/*`, and reinstall with `npm ci --ignore-scripts`. The lab tokens are fixtures in `victim-app/.npmrc`, `victim-app/.env`, and `~/.git-credentials`.

## Important File Locations

```text
scenarios/06-sha-hulud/
├── malicious-packages/shai-hulud/postinstall.js
├── victim-app/package-lock.json
├── victim-app/packages/          # victim-utils, victim-api, victim-logger, victim-auth
├── infrastructure/
│   ├── credential-harvester.js   # :3001  POST /collect
│   ├── github-actions-simulator.js  # :3002  POST /backdoor-pr
│   └── mock-registry.js          # :3003  POST /publish
└── detection-tools/worm-status.js
```

## Useful Commands

```bash
cat malicious-packages/shai-hulud/postinstall.js
cat victim-app/package.json
node detection-tools/worm-status.js victim-app
```

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Postinstall did nothing | `echo $TESTBENCH_MODE` must print `enabled`. `npm config get ignore-scripts` must be `false`. |
| Harvest is empty | Re-run `./setup.sh` so the lookalike `.npmrc` and `.git-credentials` exist, then `npm install` again. |
| Publishes array is empty | Lockfile must list `@victim-org/`, and `./setup.sh` must have planted `_authToken`. The registry returns 401 if that token is not sent as `Authorization: Bearer`. |
| A mock port is dead | From `infrastructure/`: harvester `3001`, GitHub sim `3002`, registry `3003`. There is no mock CDN in this lab. |

## Documentation Links

- Full guide: `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_06.md`
- Scenario README: `scenarios/06-sha-hulud/README.md`
- Detection runbook: `scenarios/06-sha-hulud/DETECT.md`

## Key Concepts

- The worm spreads by publishing, not by copying itself onto disk.
- Harvest runs before the fan-out. No token, no republish that matters.
- The target list comes from `package-lock.json`, scoped to `@victim-org/`.
- Each target gets a patch bump, a mock publish, and a mock backdoor PR.
- `npm start` afterwards is cover. The damage already happened at install time.

## Prevention Checklist

- [ ] Publish tokens live in CI secrets only
- [ ] `npm ci --ignore-scripts` is the default, with an allowlist
- [ ] Maintainer accounts require 2FA and provenance
- [ ] GitHub tokens are short-lived and narrowly scoped
- [ ] Registry writes and unexpected `npm publish` on laptops page someone
