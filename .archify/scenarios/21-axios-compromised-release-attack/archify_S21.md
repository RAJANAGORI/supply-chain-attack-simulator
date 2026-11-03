# Scenario 21 architecture brief: Axios-compromised-release attack

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/21-axios-compromised-release-attack`  
Control Center: `http://192.168.1.16:3100/scenarios/21`  
Guide: [Zero-to-Hero Scenario 21](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_21.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc21-axios-compromised-release-attack-architecture.html`](architecture/sc21-axios-compromised-release-attack-architecture.html) | Control Center, install script, victim app, axios-like parent, bundled transitive with postinstall, beacon server, capture files |
| Attack sequence | [`sequence/sc21-axios-compromised-release-attack-sequence.html`](sequence/sc21-axios-compromised-release-attack-sequence.html) | Install tarball → bundled dep postinstall → beacon → write IOC → manifest swap |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder's `review-3.2.0/`.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

A compromised patch release can sneak in a bundled transitive dependency whose postinstall runs before the app starts, beacons home, then swaps its own manifest to hide the postinstall from forensics.

This is not one-time supply-chain noise. It is the attacker pattern from real Axios-style maintainer takeover discussions (issue #3): trusted parent + stealthy transitive + anti-forensics.

---

## Why this lab exists

Public 2025 discussions (maintainer-account takeover patterns for npm, documented in `documentation/reference/RESOURCES.md`) describe unexpected patch semver bumps that introduce transitive dependencies with lifecycle scripts. Scenario 21 copies that pattern on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Trusted package adds unexpected transitive | axios-like@1.14.1 bundles plain-crypto-js-like via bundledDependencies |
| Transitive runs postinstall | plain-crypto-js-like postinstall.js executes during npm install |
| Exfiltration before detection | `POST http://127.0.0.1:3021/beacon` |
| Manifest swap anti-forensics | postinstall replaces its own package.json with decoy without postinstall |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 21 with port `[3021]`, one service, install/run steps, and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, packs axios-like@1.14.1 with bundled plain-crypto-js-like into tarball, and installs clean axios-like@1.14.0 in victim-app.

3. **install-compromised-release.sh** (scenario root, not victim-app)  
   Install step runs at scenario root: `npm install axios-like@file:../packages/axios-like-1.14.1.tgz`. The tarball extraction materializes the bundled transitive and triggers postinstall.

4. **victim-app**  
   Depends on clean axios-like@1.14.0 initially. Install step upgrades to compromised 1.14.1 tarball. `npm start` still works after compromise. That quiet success is the cover.

5. **plain-crypto-js-like postinstall.js**  
   The payload. Writes `.testbench-axios-ioc.json`, POSTs to `:3021/beacon`, then replaces its installed `package.json` with a decoy that has no postinstall.

6. **Mock beacon server** (`:3021`)  
   `POST /beacon` appends JSON to `captured-data.json`. `GET /captured-data` returns log. Optional Elasticsearch forwarding uses `SCAS_ES_URL`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps victim, parent, transitive, mock server, and capture files.  
- Security group **TESTBENCH_MODE=enabled** wraps only the transitive payload node. Outside that gate, postinstall returns immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` packs axios-like@1.14.1 tarball with bundled plain-crypto-js-like. Without the tarball, install step has nothing to extract.

### Chain 2 - Start mock server (step 2)

`node infrastructure/mock-server.js` must show Running. If `:3021` is down, beacon fails quietly and the Inspector stays empty.

### Chain 3 - Install compromised release (the attack)

```bash
export TESTBENCH_MODE=enabled
./install-compromised-release.sh
```

The script runs at scenario root: `cd victim-app && npm install axios-like@file:../packages/axios-like-1.14.1.tgz`. The tarball extraction always materializes the bundled transitive and runs `postinstall` before `npm start`.

#### Phase A - Bundled dependency execution

1. npm extracts axios-like@1.14.1 tarball.  
2. `bundledDependencies` array forces materialization of plain-crypto-js-like node_modules.  
3. npm runs `postinstall` of the transitive before the app starts.

#### Phase B - Payload + anti-forensics

1. Write `.testbench-axios-ioc.json` locally as forensic marker.  
2. `POST` beacon to `http://localhost:3021/beacon` with payload JSON.  
3. Swap installed `package.json` with decoy that has no `postinstall` script.

Manifest swap is anti-forensics: after install, the transitive's `package.json` looks clean. The actual execution already happened during install-time.

#### Phase C - Cover story

`npm start` still works. Victim app logs normally. Local workspace looks fine. Damage is in beacon capture and the IOC file.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Beacons | `GET :3021/captured-data` | One beacon entry with payload JSON |
| Local IOC | `.testbench-axios-ioc.json` in victim-app | File exists with postinstall timestamp |

Control Center Inspector panel maps to `:3021/captured-data` (see `captures` in `apps/control-plane/src/registry/scenarios.ts`).

Handy curls:

```bash
curl -s http://127.0.0.1:3021/captured-data
cat victim-app/.testbench-axios-ioc.json
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (port, service, captures) | `apps/control-plane/src/registry/scenarios.ts` | 251-263 |
| Setup packs tarball | `scenarios/21-axios-compromised-release-attack/setup.sh` | 8-40 |
| Install step script | `apps/control-plane/src/registry/scenarios.ts` | 252-258 |
| Bundled dependency declaration | `scenarios/21-axios-compromised-release-attack/packages/axios-like-1.14.1/package.json` | full file |
| Transitive postinstall | `scenarios/21-axios-compromised-release-attack/packages/plain-crypto-js-like/package.json` | 7-9 |
| Mock beacon server | `scenarios/21-axios-compromised-release-attack/infrastructure/mock-server.js` | 40-60 |
| README attack flow | `scenarios/21-axios-compromised-release-attack/README.md` | 40-50 |

Dirty worktree note when this brief was authored: only untracked `archify_S21.md` (plus Archify output under `.archify/`). Evidence citations are against committed bytes at the pinned revision above.

---

## Blue team / containment talk track

Hunt the transitive postinstall pattern:

- One `npm install` process  
- Runs postinstall script from a package not listed in top-level `package.json`  
- POSTs to external endpoint during install-time  

Lab helpers: `detection-tools/postinstall-monitor.js`, `credential-scanner.js`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. Check lockfile for unexpected transitives added in recent patch versions.  
2. `npm uninstall <parent>`, then `npm ci --ignore-scripts`.  
3. Inspect installed `package.json` of suspicious transitives for postinstall discrepancies.  
4. Review network logs for install-time POST requests.

Control that breaks the pattern: `npm ci --ignore-scripts` in CI environments. Postinstall can still be in the manifest. It never runs. App might break if it needed real lifecycle scripts. That breakage is the signal.

---

## How the surfaces fit together

| Surface | Job |
|---|---|
| Zero-to-Hero guide | Teacher script: why bundled transitives, manifest swap anti-forensics, IOC file evidence |
| Control Center `/scenarios/21` | Cockpit: setup → service → install → run, live logs, one evidence drawer |
| Architecture HTML | Static topology for slides / deep links into source |
| Sequence HTML | Timed install-time story for the room |
| This brief (`archify_S21.md`) | Single narrative that ties all of the above |

Same chain everywhere. Guide narrates it. UI executes it. Archify diagrams freeze the shape for reuse.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/21-axios-compromised-release-attack/architecture/candidate.json \
  .archify/scenarios/21-axios-compromised-release-attack/architecture/sc21-axios-compromised-release-attack-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/21-axios-compromised-release-attack/sequence/candidate.json \
  .archify/scenarios/21-axios-compromised-release-attack/sequence/sc21-axios-compromised-release-attack-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this bundled-transitive story is 22 (LiteLLM PyPI compromise), a different ecosystem.
