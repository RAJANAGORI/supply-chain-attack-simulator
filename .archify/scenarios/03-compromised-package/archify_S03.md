# Scenario 03 architecture brief: Compromised Package

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/03-compromised-package`  
Control Center: `http://192.168.1.16:3100/scenarios/03`  
Guide: [Zero-to-Hero Scenario 03](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_03.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc03-compromised-package-architecture.html`](architecture/sc03-compromised-package-architecture.html) | Control Center, victim app, v2.5.3 legit, v2.5.4 compromised, mock C2, capture |
| Attack sequence | [`sequence/sc03-compromised-package-sequence.html`](sequence/sc03-compromised-package-sequence.html) | Before (clean validation) → after (validation + hidden exfiltration) |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Package compromise turns trust into liability because secure-validator v2.5.3 works perfectly, v2.5.4 works identically but exfiltrates every password and API key you validate.

---

## Why this lab exists

Real 2018 event-stream and 2024 polyfill.io incidents showed that maintainer account takeover or malicious patch updates can inject credential theft into existing legitimate packages. Scenario 03 copies that before-and-after pattern on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Legitimate package hijacked | secure-validator v2.5.3 → v2.5.4 |
| Malicious code hidden in patch update | _reportMetrics hidden exfil function |
| All functionality preserved | Validation still works identically |
| Exfiltrates sensitive inputs | Passwords, API keys, emails, URLs sent to :3000 |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 03 with port `3000`, one service, run-legit/install-bad/run-bad steps, and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, creates directories, copies compromised package template to `compromised-package/secure-validator/`, installs victim app with legit v2.5.3.

3. **victim-app**  
   Workspace that requires `secure-validator`. Calls `validateEmail`, `validatePassword`, `validateUrl`, `validateInput` with sensitive data. App works identically before and after compromise.

4. **secure-validator v2.5.3** (legitimate)  
   Clean validation package. Returns validation results. No network activity.

5. **secure-validator v2.5.4** (compromised)  
   Same API, same results, hidden _reportMetrics function exfiltrates validation inputs. Looks like normal telemetry code.

6. **Mock C2 server**  
   `infrastructure/mock-server.js` on `:3000` with `POST /collect`, `GET /captured-data`, `DELETE /captured-data`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps victim, both package versions, mock server, and capture file.  
- Security group **TESTBENCH_MODE=enabled** wraps only the compromised package node. Outside that gate, _reportMetrics returns immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` creates directory structure, seeds compromised package from template, installs victim app with legitimate v2.5.3.

### Chain 2 - Start mock server (step 2)

```bash
node infrastructure/mock-server.js
```

Listener must show Running. If `:3000` is down, exfiltration fails quietly.

### Chain 3 - Run with legitimate package (before)

```bash
cd victim-app
npm start
```

App calls `validateEmail('user@example.com')` → v2.5.3 validates → returns `true` → no exfiltration. App works normally.

### Chain 4 - Install compromised package (the attack)

```bash
cd victim-app
npm install ../compromised-package/secure-validator
```

Developer thinks this is a safe patch update (v2.5.3 → v2.5.4). Functionality identical.

### Chain 5 - Run with compromised package (after)

```bash
export TESTBENCH_MODE=enabled
npm start
```

#### Phase A - Validation still works

App calls `validatePassword('SuperSecret123!')` → v2.5.4 validates → returns `{strength: 'strong', score: 8}`. Same API, same result.

#### Phase B - Hidden exfiltration

Inside the validation function, _reportMetrics POSTs to `:3000/collect` with password + metadata. Mock server appends to `captured-data.json`.

#### Phase C - Cover story

App continues to work identically. No error, no warning, no console output change. Developer notices nothing.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Captured validation inputs | `GET :3000/captured-data` | JSON with passwords, emails, API keys, URLs, system metadata |

Control Center Inspector panels map 1:1 to that URL.

Handy curl:

```bash
curl -s http://127.0.0.1:3000/captured-data
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (port, service, captures) | `apps/control-plane/src/registry/scenarios.ts` | 81-85 |
| Victim validation calls | `scenarios/03-compromised-package/victim-app/index.js` | 1-62 |
| Legitimate v2.5.3 | `scenarios/03-compromised-package/legitimate-package/secure-validator/index.js` | 1-50 |
| Compromised v2.5.4 _reportMetrics | `scenarios/03-compromised-package/templates/compromised-package-template.js` | 30-92 |
| Mock server POST /collect | `scenarios/03-compromised-package/infrastructure/mock-server.js` | 15-46 |
| Setup narrative | `scenarios/03-compromised-package/setup.sh` | 8-50 |

Dirty worktree note when this brief was authored: only untracked `archify_S3.md` (plus Archify output under `.archify/`). Evidence citations are against committed bytes at the pinned revision above.

---

## Blue team / containment talk track

Hunt the correlated shape:

- One patch update (v2.5.3 → v2.5.4) with no documented changes
- Outbound POST during validation calls
- Network activity from package that never did network before
- Timing correlation: HTTP request after every validation

Lab helpers: `detection-tools/package-scanner.js`, `forensics/compare-versions.js`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. Pin exact version in package.json and package-lock.json.  
2. Downgrade to last known good version: `npm install secure-validator@2.5.3`.  
3. Check captured-data.json for what was stolen.  
4. Rotate any passwords or API keys that appeared in the log.  
5. Review package diff before every update: `node forensics/compare-versions.js legit compromised`.

Control that breaks the loop: lock files with `npm ci`, automated diff review in CI, runtime network monitoring for unexpected POST from packages.

---

## How the surfaces fit together

| Surface | Job |
|---|---|
| Zero-to-Hero guide | Teacher script: why package compromise, before/after, hidden exfil, containment lines |
| Control Center `/scenarios/03` | Cockpit: setup → service → run-legit → install-bad → run-bad → detect, live logs, one evidence drawer |
| Architecture HTML | Static topology for slides / deep links into source |
| Sequence HTML | Timed before-and-after story for the room |
| This brief (`archify_S3.md`) | Single narrative that ties all of the above |

Same chain everywhere. Guide narrates it. UI executes it. Archify diagrams freeze the shape for reuse.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/03-compromised-package/architecture/candidate.json \
  .archify/scenarios/03-compromised-package/architecture/sc03-compromised-package-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/03-compromised-package/sequence/candidate.json \
  .archify/scenarios/03-compromised-package/sequence/sc03-compromised-package-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this compromised package story is 04 (malicious update), a different bug class.
