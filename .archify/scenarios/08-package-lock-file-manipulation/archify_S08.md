# Scenario 08 architecture brief: Package Lock File Manipulation

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/08-package-lock-file-manipulation`  
Control Center: `http://192.168.1.16:3100/scenarios/08`  
Guide: [Zero-to-Hero Scenario 08](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_08.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc08-package-lock-file-manipulation-architecture.html`](architecture/sc08-package-lock-file-manipulation-architecture.html) | Control Center, victim app, manipulated lockfile, evil-utils file: dep, mock C2, capture file, lock-file-validator.js |
| Attack sequence | [`sequence/sc08-package-lock-file-manipulation-sequence.html`](sequence/sc08-package-lock-file-manipulation-sequence.html) | npm reads lockfile → installs evil-utils → postinstall exfil → app runs |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Automated checks passed; not visually reviewed.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Package lock file manipulation spreads damage because npm installs what the lockfile declares, and reviewers miss file: dependencies that package.json review alone would catch.

---

## Why this lab exists

Real campaigns show attackers injecting malicious dependencies into package-lock.json or npm-shrinkwrap.json. Victim runs `npm install`, npm honors the lockfile, and the malicious package installs even when package.json looks clean. Scenario 08 copies that chain on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Attacker manipulates lockfile | evil-utils added to package-lock.json |
| npm installs from lockfile | npm installs evil-utils (file: dependency) |
| Postinstall runs | evil-utils postinstall.js fires |
| Secrets sent to attacker | `POST http://127.0.0.1:3000/collect` |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 08 with port `3000`, one service, install/run steps, and one capture URL.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, creates mock-server.js, builds legitimate/victim/compromised apps, and sets up lockfile with evil-utils file: dependency.

3. **victim-app**  
   Depends on `lodash` and `express`. package-lock.json includes `evil-utils` as file: dependency. `npm start` still works after compromise.

4. **evil-utils**  
   Malicious file: dependency. Postinstall.js exfiltrates system info to `:3000/collect` when TESTBENCH_MODE is enabled. Marks payload with `lockFileManipulated: true`.

5. **Mock C2 server**  
   - `mock-server.js` → `captured-data.json`  
   - Validates POST /collect payload and logs captures  
   - Optional Elasticsearch forwarding via `SCAS_ES_URL`

6. **lock-file-validator.js**  
   Detection tool that scans package-lock.json for unexpected file: dependencies and flags integrity mismatches.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps victim, lockfile, evil-utils, mock C2, and capture file.  
- Security group **TESTBENCH_MODE=enabled** wraps only the evil-utils node. Outside that gate, postinstall returns immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` creates mock server, builds apps, and generates package-lock.json with evil-utils file: dependency. npm 7+ reconciles lockfile with package.json; this lab uses file: dependency in package.json for stable demo.

### Chain 2 - Start listener (step 2)

Mock C2 must show Running on `:3000`. If down, exfil fails quietly and Inspector stays empty.

### Chain 3 - Install (the attack)

```bash
cd victim-app
export TESTBENCH_MODE=enabled
npm install
```

npm runs evil-utils postinstall before the app starts. That is the real-world lockfile manipulation pattern.

#### Phase A - npm reads lockfile

1. npm reads package-lock.json and discovers evil-utils file: dependency.  
2. npm installs evil-utils from local file: path.  
3. npm runs evil-utils postinstall.js.

#### Phase B - Postinstall exfil

1. evil-utils postinstall.js runs when npm install completes.  
2. Reads hostname, username, platform from environment.  
3. `POST` to `:3000/collect` with payload marked `lockFileManipulated: true`.

#### Phase C - Cover story

`npm start` still works. Victim sees lodash demo functioning. No runtime errors. Damage is in captured-data.json.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Captured data | `GET :3000/captured-data` | One `package-lock-manipulation` capture with `lockFileManipulated: true` |

Control Center Inspector panel maps to that URL.

Handy curls:

```bash
curl -s http://127.0.0.1:3000/captured-data
node detection-tools/lock-file-validator.js victim-app
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (port, service, captures) | `apps/control-plane/src/registry/scenarios.ts` | 155-158 |
| Mock server creation | `scenarios/08-package-lock-file-manipulation/setup.sh` | 80-120 |
| Victim entry | `scenarios/08-package-lock-file-manipulation/victim-app/index.js` | 1-23 |
| Lockfile setup | `scenarios/08-package-lock-file-manipulation/setup.sh` | 45-62 |
| POST /collect | `scenarios/08-package-lock-file-manipulation/infrastructure/mock-server.js` | 51-69 |
| Append captures | `scenarios/08-package-lock-file-manipulation/infrastructure/mock-server.js` | 74-80 |
| Detection tool | `scenarios/08-package-lock-file-manipulation/setup.sh` | 189-191 |
| Detection IOCs | `scenarios/08-package-lock-file-manipulation/DETECT.md` | full runbook |

---

## Blue team / containment talk track

Hunt the correlated shape, not a package-name string:

- One npm process  
- Installs a package from file: dependency in lockfile  
- Reads system environment (hostname, username, platform)  
- Then one outbound POST  

Lab helpers: `detection-tools/lock-file-validator.js`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script:

1. Review package-lock.json for unexpected file: dependencies.  
2. Compare package.json and package-lock.json for mismatches.  
3. `npm uninstall evil-utils`, then `npm ci --ignore-scripts`.  
4. Check captured-data.json for exfil timestamps.

Control that breaks the loop: lockfile integrity validation in CI. Flag unexpected file: dependencies. Postinstall file reads and network POST are the IOCs.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/08-package-lock-file-manipulation/architecture/candidate.json \
  .archify/scenarios/08-package-lock-file-manipulation/architecture/sc08-package-lock-file-manipulation-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/08-package-lock-file-manipulation/sequence/candidate.json \
  .archify/scenarios/08-package-lock-file-manipulation/sequence/sc08-package-lock-file-manipulation-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this lockfile story is 09 (package-signing-bypass), a different bug class.
