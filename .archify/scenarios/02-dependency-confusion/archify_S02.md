# Scenario 02 architecture brief: Dependency Confusion

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/02-dependency-confusion`  
Control Center: `http://192.168.1.16:3100/scenarios/02`  
Guide: [Zero-to-Hero Scenario 02](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_02.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc02-dependency-confusion-architecture.html`](architecture/sc02-dependency-confusion-architecture.html) | Control Center, corporate app, .npmrc misconfig, attacker registry, mock C2, capture files |
| Attack sequence | [`sequence/sc02-dependency-confusion-sequence.html`](sequence/sc02-dependency-confusion-sequence.html) | npm queries :4874 → v999.999.999 → postinstall → exfiltrate |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Dependency confusion turns a registry routing mistake into a supply chain breach because npm picks the highest available version, and attacker's 999.999.999 beats any internal 1.x or 2.x.

---

## Why this lab exists

Alex Birsan's 2021 research showed that misconfigured .npmrc files let attackers publish higher-versioned packages under internal scope names, compromising Microsoft, Apple, Tesla, and 30+ companies. Scenario 02 copies that registry race on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Private scope leaked in public repo | `@techcorp` in leaked-data/package.json |
| Attacker publishes to public npm | Fake registry on `http://localhost:4874/` |
| Org's .npmrc routes scope to public | `@techcorp:registry=http://localhost:4874/` in corporate-app/.npmrc |
| Version 999.999.999 beats internal 1.x | registry-server.js serves v999.999.999 metadata |
| Malicious postinstall exfiltrates config | POST to `http://127.0.0.1:3000/collect` |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 02 with ports `[3000, 4874]`, two services, install/run steps, and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, creates leaked-data/, internal-packages/, attacker-packages/, corporate-app/, seeds malicious package template, builds registry metadata with `build-registry.js`, and writes infrastructure/mock-server.js.

3. **corporate-app**  
   Workspace that depends on `@techcorp/auth-lib`, `@techcorp/data-utils`, `@techcorp/api-client`. The .npmrc file routes `@techcorp` scope to attacker registry instead of internal registry. `npm start` still works after compromise.

4. **.npmrc config** (misconfigured)  
   File inside corporate-app/ with `@techcorp:registry=http://localhost:4874/`. This is the bug - should point to internal registry.

5. **Attacker registry** (registry-server.js on :4874)  
   Fake npm registry that serves `@techcorp/auth-lib@999.999.999` metadata and tarball. When npm queries for @techcorp packages, this server responds with the malicious version.

6. **registry-meta.json**  
   Package metadata for the attacker registry. Contains version 999.999.999 and tarball dist URLs.

7. **@techcorp/auth-lib postinstall**  
   Malicious package declares postinstall script. npm runs it after tarball extraction. Exfiltrates config data (API keys, DB connections) passed to package init functions.

8. **Mock C2 server**  
   `infrastructure/mock-server.js` on `:3000` with `POST /collect`, `GET /captured-data`, `DELETE /captured-data`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps corporate app, .npmrc, attacker registry, registry metadata, malicious package, mock server, and capture file.  
- Security group **TESTBENCH_MODE=enabled** wraps only the malicious package node. Outside that gate, postinstall exfiltration returns immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` creates directory structure, seeds attacker packages, builds registry metadata by packing the malicious tarball, and writes both mock-server.js and registry-server.js.

### Chain 2 - Start services (step 2)

Two terminals:

```bash
# Terminal A - mock C2
node infrastructure/mock-server.js

# Terminal B - attacker registry
node infrastructure/registry-server.js
```

Both must show Running. If `:4874` is down, npm install fails. If `:3000` is down, exfiltration fails quietly.

### Chain 3 - Install (the attack)

```bash
cd corporate-app
rm -rf node_modules package-lock.json
export TESTBENCH_MODE=enabled
npm install
```

#### Phase A - Read .npmrc routing

npm reads corporate-app/.npmrc and sees `@techcorp:registry=http://localhost:4874/`.

#### Phase B - Resolve from attacker registry

npm sends `GET /@techcorp%2Fauth-lib` to :4874. Attacker registry responds with v999.999.999 metadata.

#### Phase C - Download malicious tarball

npm requests `GET /@techcorp/auth-lib/-/auth-lib-999.999.999.tgz`. Registry returns the malicious tarball.

#### Phase D - Postinstall fires

npm extracts the tarball and runs the postinstall script before the app starts. Malicious code collects config data (API keys, DB connections) passed during package initialization.

#### Phase E - Exfiltrate

Postinstall POSTs to `:3000/collect`. Mock server appends to `captured-data.json`.

#### Phase F - Cover story

Install completes successfully. App still works because malicious package provides real authentication functionality. Developer sees normal output.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Captured config data | `GET :3000/captured-data` | JSON with attack metadata, captured config (API keys, DB strings), system info |

Control Center Inspector panels map 1:1 to that URL.

Handy curls:

```bash
curl -s http://127.0.0.1:3000/captured-data
curl -s http://127.0.0.1:4874/@techcorp/auth-lib   # registry metadata
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (ports, services, captures) | `apps/control-plane/src/registry/scenarios.ts` | 71-80 |
| Corporate app requires @techcorp packages | `scenarios/02-dependency-confusion/corporate-app/index.js` | 8-11 |
| .npmrc scope routing misconfiguration | `scenarios/02-dependency-confusion/corporate-app/.npmrc` | 1-9 |
| Attacker registry metadata + tarball routes | `scenarios/02-dependency-confusion/infrastructure/registry-server.js` | 41-79 |
| Postinstall exfiltration | `scenarios/02-dependency-confusion/templates/dependency-confusion-template.js` | 30-91 |
| Mock server POST /collect | `scenarios/02-dependency-confusion/infrastructure/mock-server.js` | 15-46 |
| Setup narrative | `scenarios/02-dependency-confusion/setup.sh` | 8-350 |

Dirty worktree note when this brief was authored: only untracked `archify_S2.md` (plus Archify output under `.archify/`). Evidence citations are against committed bytes at the pinned revision above.

---

## Blue team / containment talk track

Hunt the correlated shape:

- One .npmrc with scope routing to unexpected registry URL
- One `npm install` that resolves unusually high version (999.x, 9999.x)
- Package source from public registry when internal scope expected
- Postinstall script execution after tarball extraction
- Outbound POST with config data during install

Lab helpers: `detection-tools/dependency-confusion-scanner.js`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. Fix .npmrc: route @techcorp scope to internal registry URL.  
2. Uninstall malicious packages: `npm uninstall @techcorp/auth-lib`.  
3. Lock file audit: check package-lock.json for resolved URLs from wrong registry.  
4. Rotate any tokens that appeared in captured-data.json.  
5. Reserve @techcorp scope on public registries to block future attacks.

Control that breaks the loop: correct scope routing in .npmrc, enforce exact versions in package.json, run registry source validation in CI.

---

## How the surfaces fit together

| Surface | Job |
|---|---|
| Zero-to-Hero guide | Teacher script: why dependency confusion, registry race, version wins, containment lines |
| Control Center `/scenarios/02` | Cockpit: setup → 2 services → install → run → detect, live logs, one evidence drawer |
| Architecture HTML | Static topology for slides / deep links into source |
| Sequence HTML | Timed registry resolution story for the room |
| This brief (`archify_S2.md`) | Single narrative that ties all of the above |

Same chain everywhere. Guide narrates it. UI executes it. Archify diagrams freeze the shape for reuse.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/02-dependency-confusion/architecture/candidate.json \
  .archify/scenarios/02-dependency-confusion/architecture/sc02-dependency-confusion-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/02-dependency-confusion/sequence/candidate.json \
  .archify/scenarios/02-dependency-confusion/sequence/sc02-dependency-confusion-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this registry race is 03 (compromised package), a different bug class.
