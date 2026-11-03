# Scenario 17 architecture brief: Multi-stage attack chain

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/17-multi-stage-attack-chain`  
Control Center: `http://192.168.1.16:3100/scenarios/17`  
Guide: [Zero-to-Hero Scenario 17](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_17.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc17-multi-stage-attack-chain-architecture.html`](architecture/sc17-multi-stage-attack-chain-architecture.html) | Control Center, victim workspace, stage1 and stage2 packages, handoff file, mock C2, capture file, optional Floci |
| Attack sequence | [`sequence/sc17-multi-stage-attack-chain-sequence.html`](sequence/sc17-multi-stage-attack-chain-sequence.html) | Install → stage1 steal + write → stage2 read + exfil → complete |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder's `review-3.2.0/`.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Multi-stage attacks split malicious behavior across multiple packages: stage1 steals and writes evidence to disk, stage2 reads that evidence and exfils the complete payload, making attribution and detection harder.

This is not "one bad package." It is coordinated execution. Detectors must correlate both stages.

---

## Why this lab exists

Public 2024-2025 writeups (multi-stage campaigns in StepSecurity notes, `documentation/reference/RESOURCES.md`) describe install-time scripts that split exfiltration across multiple stages: one package harvests credentials and writes them locally, another reads that handoff file and completes the exfil. Scenario 17 copies that pattern on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Stage1 steals credentials | `packages/stage1-access-lib/index.js` writeToken() |
| Stage1 writes handoff file | `.stolen/token.json` |
| Stage2 reads handoff file | `packages/stage2-compromised-lib/index.js` |
| Stage2 exfils complete payload | `POST http://127.0.0.1:3017/collect` |

Safety never leaves the box: both stages gate on `TESTBENCH_MODE === 'enabled'` and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 17 with port `3017`, one service, install/run steps, and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, builds `packages/stage1-access-lib` and `packages/stage2-compromised-lib`, and creates `victim-app` workspace.

3. **victim-app**  
   Workspace that depends on both stage1 and stage2. `npm start` still greets normally after compromise. That quiet success is the cover.

4. **stage1-access-lib**  
   The first stage. Generates a mock stolen token, writes `.stolen/token.json`, and exfils a stage1 capture to `:3017/collect`.

5. **stage2-compromised-lib**  
   The second stage. Reads `.stolen/token.json`, exfils a stage2 capture with the complete payload to `:3017/collect`.

6. **Mock C2 server**  
   `infrastructure/mock-server.js` → `captured-data.json`  
   Expects two captures: stage1 exfil, then stage2 exfil.

7. **Optional Floci**  
   When Floci helpers load, stage1 JSON can dual-write to `s3://scas-sc17-artifacts/`. Optional Elasticsearch forwarding uses `SCAS_ES_URL` on the C2 process.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps victim, stages, handoff file, mock C2, capture file, and Floci.  
- Security group **TESTBENCH_MODE=enabled** wraps both stage nodes. Outside that gate, no handoff or exfil occurs.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` builds both stage packages and victim workspace before anything "malicious" runs.

### Chain 2 - Start listener (step 2)

Mock C2 must show Running. If `:3017` is down, exfils fail quietly and the Inspector stays empty.

### Chain 3 - Install (the attack)

```bash
cd victim-app
export TESTBENCH_MODE=enabled
npm install ../packages/stage1-access-lib ../packages/stage2-compromised-lib
npm start
```

npm loads stage1, which writes `.stolen/token.json` and POSTs stage1 exfil. Then npm loads stage2, which reads `.stolen/token.json` and POSTs stage2 exfil with the complete payload.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Two-stage captures | `GET :3017/captured-data` | Two rows: stage1 exfil, then stage2 exfil |

Control Center Inspector panel maps 1:1 to that URL (see `captures` in `apps/control-plane/src/registry/scenarios.ts`).

Handy curls:

```bash
curl -s http://127.0.0.1:3017/captured-data
node detection-tools/multi-stage-correlator.js .
```

---

## Blue team / containment talk track

Hunt the correlated shape, not a package-name string:

- One npm install  
- File write by stage1 to `.stolen/`  
- File read by stage2 from `.stolen/`  
- Two POST /collect events within same install window  

Lab helpers: `detection-tools/multi-stage-correlator.js`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. Uninstall both stages; `rm -rf .stolen` directory.  
2. Monitor file writes by `node_modules` packages during install.  
3. Correlate stage1 and stage2 POST events within same install window.

Control that breaks the chain: monitor for file writes from `node_modules` during install. Stage1 can still steal. It cannot write the handoff. Stage2 finds nothing. Chain dies at stage one.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/17-multi-stage-attack-chain/architecture/candidate.json \
  .archify/scenarios/17-multi-stage-attack-chain/architecture/sc17-multi-stage-attack-chain-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/17-multi-stage-attack-chain/sequence/candidate.json \
  .archify/scenarios/17-multi-stage-attack-chain/sequence/sc17-multi-stage-attack-chain-sequence.html \
  --repo-root . --quality showcase --json
```
