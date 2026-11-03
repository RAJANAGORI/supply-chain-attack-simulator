# Scenario 13 architecture brief: Package Metadata Manipulation

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/13-package-metadata-manipulation`  
Control Center: `http://192.168.1.16:3100/scenarios/13`  
Guide: [Zero-to-Hero Scenario 13](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_13.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc13-package-metadata-manipulation-architecture.html`](architecture/sc13-package-metadata-manipulation-architecture.html) | Control Center, victim-app, clean-utils package with tampered package.json, mock collector :3001 |
| Attack sequence | [`sequence/sc13-package-metadata-manipulation-sequence.html`](sequence/sc13-package-metadata-manipulation-sequence.html) | Install clean-utils → npm runs tampered postinstall → beacon to :3001 |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check).

---

## Verdict in one line

Metadata manipulation works because tampered package.json scripts.postinstall hooks execute automatically during npm install, even when source code stays clean.

This is not source code injection. It is a metadata field attack.

---

## Why this lab exists

Public 2025 research describes compromised packages where only package.json metadata changed while source files stayed intact. Attacker tampers with scripts.postinstall field to add malicious hook. Scenario 13 runs that on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Tampered package.json postinstall | compromised-packages/clean-utils/package.json with postinstall script |
| Postinstall beacons metadata | POST http://127.0.0.1:3001/capture |
| Clean source code | clean-utils/index.js has legitimate functionality |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map

1. **Control Center** - registers scenario 13 with port `[3001]`, one service, install/run steps, and one capture URL.

2. **setup.sh** - sources `scenarios/_shared/enable-testbench.sh`.

3. **victim-app** - installs `../compromised-packages/clean-utils`. `npm install` runs postinstall automatically.

4. **clean-utils package** - package.json scripts.postinstall field points to postinstall.js that gates on `TESTBENCH_MODE` and POSTs to `:3001/capture` with hostname, timestamp, and metadata note.

5. **mock-server.js** - collector on `:3001` that appends POST `/capture` payloads to `captured-data.json`.

---

## Attack chain

### Setup

`./setup.sh` enables testbench before any install.

### Install (the attack)

```bash
cd victim-app
export TESTBENCH_MODE=enabled
npm install ../compromised-packages/clean-utils
```

npm reads package.json scripts.postinstall and runs the hook before the app starts.

#### Phase A - Lifecycle execution

postinstall.js checks `TESTBENCH_MODE` and collects hostname, timestamp.

#### Phase B - Beacon

POST to `:3001/capture` with metadata payload.

#### Phase C - Run

`node index.js` still works. Source code is clean. Only metadata was tampered.

---

## Evidence

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Metadata exfil | `GET :3001/captured-data` | One row with metadata-manipulation-sim note |

---

## Blue team

Hunt metadata fields, not just source code:

- Audit package.json scripts before install  
- Compare package.json against published registry records  
- Monitor postinstall network calls during install  

Containment: freeze the package, compare tarball metadata SHA against npmjs.com, review scripts fields.

Control that breaks the loop: verify package.json integrity against upstream before install. Package signing helps but only if metadata is included in signature.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/13-package-metadata-manipulation/architecture/candidate.json \
  .archify/scenarios/13-package-metadata-manipulation/architecture/sc13-package-metadata-manipulation-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/13-package-metadata-manipulation/sequence/candidate.json \
  .archify/scenarios/13-package-metadata-manipulation/sequence/sc13-package-metadata-manipulation-sequence.html \
  --repo-root . --quality showcase --json
```
