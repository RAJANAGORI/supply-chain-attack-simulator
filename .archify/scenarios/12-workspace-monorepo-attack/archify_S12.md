# Scenario 12 architecture brief: Workspace Monorepo Attack

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/12-workspace-monorepo-attack`  
Control Center: `http://192.168.1.16:3100/scenarios/12`  
Guide: [Zero-to-Hero Scenario 12](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_12.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc12-workspace-monorepo-attack-architecture.html`](architecture/sc12-workspace-monorepo-attack-architecture.html) | Control Center, workspace root with packages (api, utils, auth), swap script, compromised @devcorp/utils, mock collector :3000 |
| Attack sequence | [`sequence/sc12-workspace-monorepo-attack-sequence.html`](sequence/sc12-workspace-monorepo-attack-sequence.html) | Swap → npm start → require @devcorp/utils → postinstall beacon |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder's `review-3.2.0/`.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Workspace attack works because npm workspaces link local packages without verification, so an attacker who swaps a clean package directory with a compromised copy inherits full workspace trust.

This is not an install-time registry attack. It is a local package substitution.

---

## Why this lab exists

Public 2025 research describes compromised workspace or monorepo packages that leak internal structure and secrets. An attacker with filesystem write access (insider threat, compromised dev machine, or malicious script) overwrites a workspace package directory. Scenario 12 runs that on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Workspace package tampering | swap-compromised-utils.sh overwrites packages/utils/ |
| Postinstall runs when package is required | npm start requires @devcorp/utils, runs postinstall.js |
| Exfiltrates workspace layout | POST http://127.0.0.1:3000/collect with workspace structure |
| Trusted workspace linking | npm workspaces shares node_modules across packages |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 12 with ports `[3000]`, one service, install-root/install-api/install-utils/swap/run steps, and one capture URL.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh` and builds clean workspace with packages api, utils, and auth. Runs `npm install` at workspace root to link local packages.

3. **Workspace root**  
   npm workspaces project with `packages/*` as workspace members. Depends on `@devcorp/api`, `@devcorp/utils`, and `@devcorp/auth`. Workspace linking shares node_modules without extra installs.

4. **swap-compromised-utils.sh**  
   Copies `compromised-package/utils/` over `packages/utils/`, replacing clean code with malicious postinstall.js.

5. **Compromised @devcorp/utils**  
   Package with postinstall.js that gates on `TESTBENCH_MODE` and collects workspace root path, package list, environment variables, platform info, and node version, then POSTs to `:3000/collect`.

6. **victim-app**  
   Workspace member that requires `@devcorp/utils`. `npm start` triggers postinstall when the package loads.

7. **mock-server.js**  
   Collector on `:3000` that appends POST `/collect` payloads to `captured-data.json`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps workspace, swap script, compromised package, victim-app, mock collector, and capture files.  
- Security group **TESTBENCH_MODE=enabled** wraps only the compromised-utils package.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` builds clean workspace before any swap. The workspace must exist before tampering.

### Chain 2 - Swap (the attack trigger)

```bash
./swap-compromised-utils.sh
```

This overwrites `packages/utils/` with compromised code. No install command is needed; workspace linking is already in place.

### Chain 3 - Start (postinstall fires)

```bash
cd victim-app
export TESTBENCH_MODE=enabled
npm start
```

`victim-app/index.js` requires `@devcorp/utils`. npm loads the package and runs postinstall.js.

#### Phase A - Collect workspace data

Postinstall reads:
- Workspace root path  
- Package list from workspace config  
- Environment variables (CI, NODE_ENV)  
- Platform and node version  

#### Phase B - Beacon

POST to `:3000/collect` with JSON payload containing workspace layout.

#### Phase C - Cover story

`npm start` still works. `victim-app` loads utils normally. No postinstall remains after the first run. Working tree looks fine. Damage is in the collector history.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Exfiltrated workspace data | `GET :3000/captured-data` | One row with attackType "workspace-monorepo", workspace root, package list |

Control Center Inspector panel maps to that URL.

Handy curls:

```bash
curl -s http://127.0.0.1:3000/captured-data
node detection-tools/workspace-scanner.js .
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (ports, services, captures) | `apps/control-plane/src/registry/scenarios.ts` | 190-202 |
| Workspace config | `scenarios/12-workspace-monorepo-attack/package.json` | 1-10 |
| Swap script | `scenarios/12-workspace-monorepo-attack/swap-compromised-utils.sh` | 1-15 |
| Postinstall exfil | `scenarios/12-workspace-monorepo-attack/compromised-package/utils/postinstall.js` | 40-87 |
| Mock collector | `scenarios/12-workspace-monorepo-attack/infrastructure/mock-server.js` | 12-50 |
| Victim app | `scenarios/12-workspace-monorepo-attack/victim-app/index.js` | 1-15 |
| Setup narrative | `scenarios/12-workspace-monorepo-attack/setup.sh` | 1-30 |
| Detection IOCs | `scenarios/12-workspace-monorepo-attack/DETECT.md` | full runbook |

---

## Blue team / containment talk track

Hunt the workspace trust gap:

- Workspace packages link without verification  
- Filesystem write access allows package directory swap  
- Postinstall runs when package is required  

Lab helpers: `detection-tools/workspace-scanner.js` audits workspace packages for unexpected scripts. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. Audit workspace package.json files for unexpected postinstall scripts.  
2. Compare workspace packages against approved source repositories.  
3. Monitor filesystem writes to workspace package directories.  
4. Use file integrity monitoring on workspace root.

Control that breaks the loop: workspace packages must be read-only or under version control. Local package directories should not be writable by build or dev tools.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/12-workspace-monorepo-attack/architecture/candidate.json \
  .archify/scenarios/12-workspace-monorepo-attack/architecture/sc12-workspace-monorepo-attack-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/12-workspace-monorepo-attack/sequence/candidate.json \
  .archify/scenarios/12-workspace-monorepo-attack/sequence/sc12-workspace-monorepo-attack-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this workspace story is 13 (package metadata manipulation), a different injection vector.
