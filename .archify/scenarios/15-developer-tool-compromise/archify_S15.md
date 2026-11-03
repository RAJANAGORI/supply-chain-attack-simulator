# Scenario 15 architecture brief: Developer Tool Compromise

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/15-developer-tool-compromise`  
Control Center: `http://192.168.1.16:3100/scenarios/15`  
Guide: [Zero-to-Hero Scenario 15](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_15.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc15-developer-tool-compromise-architecture.html`](architecture/sc15-developer-tool-compromise-architecture.html) | Control Center, install script, malicious dev-tool, victim-app, mock collector :3015 |
| Attack sequence | [`sequence/sc15-developer-tool-compromise-sequence.html`](sequence/sc15-developer-tool-compromise-sequence.html) | Run install script → npm install dev-tool → postinstall → beacon to :3015 |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check).

---

## Verdict in one line

Developer tool compromise works because dev tools install with developer privileges and postinstall hooks beacon environment details before legitimate work starts.

This is not production runtime attack. It is a development environment exfiltration.

---

## Why this lab exists

Public 2025 research describes compromised developer tools (linters, formatters, build tools) that steal environment variables, credentials, or workspace structure. Attacker publishes malicious dev tool or compromises existing one. Scenario 15 runs that on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Malicious dev tool install | install-malicious-tool.sh runs npm install |
| Postinstall exfils dev environment | POST http://127.0.0.1:3015/collect |
| Developer machine compromise | Collects hostname, username, platform, cwd, CI/NODE_ENV |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map

1. **Control Center** - registers scenario 15 with port `[3015]`, one service, install/run steps, and one capture URL.

2. **setup.sh** - sources `scenarios/_shared/enable-testbench.sh`.

3. **install-malicious-tool.sh** - runs `npm install` for malicious dev-tool package.

4. **Malicious dev-tool** - package with postinstall.js that gates on `TESTBENCH_MODE` and collects hostname, username, platform, cwd, environment (CI, NODE_ENV), then POSTs to `:3015/collect`.

5. **victim-app** - uses the dev tool (simulated by npm start). Tool is already in devDependencies after install.

6. **mock-server.js** - collector on `:3015` that appends POST `/collect` payloads to `captured-data.json`.

---

## Attack chain

### Setup

`./setup.sh` enables testbench before any tool installs.

### Install (the attack)

```bash
export TESTBENCH_MODE=enabled
./install-malicious-tool.sh
```

Script runs `npm install` for malicious dev-tool. npm runs postinstall automatically.

#### Phase A - Postinstall execution

postinstall.js checks `TESTBENCH_MODE`, collects developer environment details.

#### Phase B - Beacon

POST to `:3015/collect` with dev environment payload.

#### Phase C - Run

`npm start` in victim-app still works. Dev tool is in devDependencies. Exfil already happened during install.

---

## Evidence

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Dev environment exfil | `GET :3015/captured-data` | One row with developer-tool-compromise stage, hostname, username, platform |

---

## Blue team

Hunt dev tool trust boundary:

- Audit devDependencies for unexpected postinstall scripts  
- Review developer tool origins before install  
- Monitor network calls during dev tool installation  

Containment: remove malicious dev-tool from package.json, audit other devDependencies, check for persistent hooks in `.git/hooks/` or global npm config.

Control that breaks the loop: vet dev tools before install. Use locked-down CI environments where dev tools cannot access secrets. Isolate developer environments from production credentials.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/15-developer-tool-compromise/architecture/candidate.json \
  .archify/scenarios/15-developer-tool-compromise/architecture/sc15-developer-tool-compromise-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/15-developer-tool-compromise/sequence/candidate.json \
  .archify/scenarios/15-developer-tool-compromise/sequence/sc15-developer-tool-compromise-sequence.html \
  --repo-root . --quality showcase --json
```
