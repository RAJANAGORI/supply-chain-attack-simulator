# Scenario 04 architecture brief: Malicious Update

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/04-malicious-update`  
Control Center: `http://192.168.1.16:3100/scenarios/04`  
Guide: [Zero-to-Hero Scenario 04](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_04.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc04-malicious-update-architecture.html`](architecture/sc04-malicious-update-architecture.html) | Control Center, victim app with ^2.1.0 range, malicious v2.1.1, mock C2, capture |
| Attack sequence | [`sequence/sc04-malicious-update-sequence.html`](sequence/sc04-malicious-update-sequence.html) | npm install resolves range → v2.1.1 → exfiltrate |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Malicious updates exploit version ranges because `^2.1.0` means "anything from 2.1.0 to <3.0.0", and attacker's 2.1.1 wins automatically.

---

## Why this lab exists

Real incidents (2019 event-stream update, 2020 octopus-scanner) showed that attackers publish malicious patch versions that match semver ranges in package.json, auto-updating victim projects. Scenario 04 copies that version-range pattern on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Dependency declares semver range | `^2.1.0` in victim-app/package.json |
| Attacker publishes higher patch | utils-helper v2.1.1 malicious |
| npm install pulls latest match | Resolves to v2.1.1 automatically |
| Exfiltration on module load | POST to `http://127.0.0.1:3000/collect` |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 04 with port `3000`, one service, install/run steps, and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, creates malicious-update/utils-helper from template, writes infrastructure/mock-server.js.

3. **victim-app**  
   Workspace with `"utils-helper": "^2.1.0"` in package.json. Version range allows automatic update to v2.1.1.

4. **utils-helper v2.1.1** (malicious update)  
   Exfiltration code runs on module load, not on function call. Happens before app logic starts.

5. **Mock C2 server**  
   `infrastructure/mock-server.js` on `:3000` with `POST /collect`, `GET /captured-data`, `DELETE /captured-data`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps victim, malicious update, mock server, and capture file.  
- Security group **TESTBENCH_MODE=enabled** wraps only the malicious update node. Outside that gate, exfiltration returns immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` creates directory structure, seeds malicious update from template.

### Chain 2 - Start mock server (step 2)

```bash
node infrastructure/mock-server.js
```

Listener must show Running. If `:3000` is down, exfiltration fails quietly.

### Chain 3 - Install (the attack)

```bash
cd victim-app
npm install
```

npm reads package.json, sees `^2.1.0`, queries for latest matching version, gets v2.1.1 from local malicious-update path, installs it.

### Chain 4 - Run

```bash
export TESTBENCH_MODE=enabled
npm start
```

App requires `utils-helper`. Module load triggers exfiltration before any function call. POSTs to `:3000/collect`. Mock server appends to `captured-data.json`. App still works normally.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Captured update event | `GET :3000/captured-data` | JSON with timestamp, updateVersion 2.1.1, env vars, system info |

Control Center Inspector panels map 1:1 to that URL.

Handy curl:

```bash
curl -s http://127.0.0.1:3000/captured-data
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (port, service, captures) | `apps/control-plane/src/registry/scenarios.ts` | 86-89 |
| Victim version range | `scenarios/04-malicious-update/victim-app/package.json` | 1-14 |
| Malicious update exfiltration | `scenarios/04-malicious-update/templates/malicious-update-template.js` | 33-92 |
| Mock server POST /collect | `scenarios/04-malicious-update/infrastructure/mock-server.js` | 15-46 |
| Setup narrative | `scenarios/04-malicious-update/setup.sh` | 8-70 |

Dirty worktree note when this brief was authored: only untracked `archify_S4.md` (plus Archify output under `.archify/`). Evidence citations are against committed bytes at the pinned revision above.

---

## Blue team / containment talk track

Hunt the correlated shape:

- One `npm install` with version range dependency
- Resolved version higher than expected (2.1.1 when 2.1.0 was last seen)
- Module load triggers network activity
- Outbound POST before any app function runs

Lab helpers: `detection-tools/update-scanner.js`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. Pin exact versions in package.json and commit package-lock.json.  
2. Downgrade to last known good: `npm install utils-helper@2.1.0`.  
3. Check captured-data.json for what was stolen.  
4. Use `npm ci` in production - never `npm install`.

Control that breaks the loop: lock files with exact versions, `npm ci` in CI/CD, automated diff review for every dependency change.

---

## How the surfaces fit together

| Surface | Job |
|---|---|
| Zero-to-Hero guide | Teacher script: why malicious updates, version ranges, auto-update risk, containment lines |
| Control Center `/scenarios/04` | Cockpit: setup → service → install → run → detect, live logs, one evidence drawer |
| Architecture HTML | Static topology for slides / deep links into source |
| Sequence HTML | Timed auto-update story for the room |
| This brief (`archify_S4.md`) | Single narrative that ties all of the above |

Same chain everywhere. Guide narrates it. UI executes it. Archify diagrams freeze the shape for reuse.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/04-malicious-update/architecture/candidate.json \
  .archify/scenarios/04-malicious-update/architecture/sc04-malicious-update-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/04-malicious-update/sequence/candidate.json \
  .archify/scenarios/04-malicious-update/sequence/sc04-malicious-update-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this auto-update story is 05 (build compromise), a different bug class.
