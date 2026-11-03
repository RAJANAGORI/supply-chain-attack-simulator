# Scenario 01 architecture brief: Typosquatting

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/01-typosquatting`  
Control Center: `http://192.168.1.16:3100/scenarios/01`  
Guide: [Zero-to-Hero Scenario 01](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_01.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc01-typosquatting-architecture.html`](architecture/sc01-typosquatting-architecture.html) | Control Center, victim app, typo package, mock C2, capture file |
| Attack sequence | [`sequence/sc01-typosquatting-sequence.html`](sequence/sc01-typosquatting-sequence.html) | Install → require() → exfiltrate → app works |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Typosquatting turns a typo into compromise because package registries let anyone publish under any name, and one missing 's' in `npm install` is all it takes.

---

## Why this lab exists

Public 2017 crossenv and 2018 jellyfish incidents (capital I vs lowercase l) showed that typo names steal real credentials when developers make simple install mistakes. Scenario 01 copies that pattern on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Malicious package name one char away | `request-lib` vs `requests-lib` |
| Exfiltrate environment variables | POST to `http://127.0.0.1:3000/collect` |
| App still works to avoid detection | Typo package proxies real HTTP functionality |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 01 with port `3000`, one service, install/run steps, and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, creates `malicious-packages/request-lib/` from the template, installs victim app dependencies, and writes `infrastructure/mock-server.js` inline.

3. **victim-app**  
   Workspace that requires `request-lib` (the typo). `npm start` still works after compromise because the malicious package provides real HTTP request functionality.

4. **request-lib package** (the typo)  
   Malicious code runs on `require()`, not on function call. Exfiltration fires before the app logic even starts. TESTBENCH_MODE gate and localhost-only target.

5. **Mock C2 server**  
   `infrastructure/mock-server.js` on `:3000` with `POST /collect`, `GET /captured-data`, `DELETE /captured-data`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps victim, typo package, mock server, and capture file.  
- Security group **TESTBENCH_MODE=enabled** wraps only the typo package node. Outside that gate, exfiltration returns immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` creates directories and seeds the typo package from the template.

### Chain 2 - Start mock server (step 2)

```bash
node infrastructure/mock-server.js
```

Listener must show Running. If `:3000` is down, exfiltration fails quietly and the Inspector stays empty.

### Chain 3 - Install (the typo)

```bash
cd victim-app
npm install ../malicious-packages/request-lib
```

Developer meant to install `requests-lib` but typed `request-lib`.

### Chain 4 - Run (attack fires)

```bash
export TESTBENCH_MODE=enabled
npm start
```

#### Phase A - Require loads malicious code

`victim-app/index.js` line 12: `require('request-lib')`. Module load triggers `exfiltrateData()` at the top level, before any function call.

#### Phase B - Exfiltrate

Malicious code collects env vars (`NODE_ENV`, `PWD`, `USER`, system info) and POSTs to `:3000/collect`. Mock server appends to `captured-data.json`.

#### Phase C - Cover story

App still makes legitimate HTTP requests using the typo package's real functionality. Developer sees normal output and no error.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Captured environment data | `GET :3000/captured-data` | JSON with timestamp, environment vars, system info |

Control Center Inspector panels map 1:1 to that URL.

Handy curl:

```bash
curl -s http://127.0.0.1:3000/captured-data
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (port, service, captures) | `apps/control-plane/src/registry/scenarios.ts` | 67-70 |
| Victim requires typo | `scenarios/01-typosquatting/victim-app/index.js` | 12 |
| Exfiltration on require() | `scenarios/01-typosquatting/templates/malicious-package-template.js` | 33-93, 96-100 |
| Mock server POST /collect | `scenarios/01-typosquatting/setup.sh` | 89-124 (inline) |
| Setup narrative | `scenarios/01-typosquatting/setup.sh` | 8-160 |

Dirty worktree note when this brief was authored: only untracked `archify_S1.md` (plus Archify output under `.archify/`). Evidence citations are against committed bytes at the pinned revision above.

---

## Blue team / containment talk track

Hunt the shape:

- One `npm install` command with a typo
- Malicious code runs on `require()`, not on function call
- Environment variable reads before any app logic
- Outbound POST to external IP on module load

Lab helpers: `detection-tools/package-scanner.js`, `network-monitor.sh`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. Uninstall the typo package: `npm uninstall request-lib`.  
2. Install the correct package: `npm install requests-lib`.  
3. Check `captured-data.json` for what was stolen.  
4. Rotate any tokens that appeared in env vars.

Control that breaks the loop: always check package names before install. Use lock files with `npm ci`. Run automated scanning on every PR.

---

## How the surfaces fit together

| Surface | Job |
|---|---|
| Zero-to-Hero guide | Teacher script: why typosquatting, typo example, exfiltration proof, containment lines |
| Control Center `/scenarios/01` | Cockpit: setup → service → install → run → detect, live logs, one evidence drawer |
| Architecture HTML | Static topology for slides / deep links into source |
| Sequence HTML | Timed install-time story for the room |
| This brief (`archify_S1.md`) | Single narrative that ties all of the above |

Same chain everywhere. Guide narrates it. UI executes it. Archify diagrams freeze the shape for reuse.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/01-typosquatting/architecture/candidate.json \
  .archify/scenarios/01-typosquatting/architecture/sc01-typosquatting-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/01-typosquatting/sequence/candidate.json \
  .archify/scenarios/01-typosquatting/sequence/sc01-typosquatting-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this typo story is 02 (dependency confusion), a different bug class.
