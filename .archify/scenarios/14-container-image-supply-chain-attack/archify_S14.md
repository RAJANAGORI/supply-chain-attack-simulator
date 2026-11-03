# Scenario 14 architecture brief: Container Image Supply Chain Attack

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/14-container-image-supply-chain-attack`  
Control Center: `http://192.168.1.16:3100/scenarios/14`  
Guide: [Zero-to-Hero Scenario 14](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_14.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc14-container-image-supply-chain-attack-architecture.html`](architecture/sc14-container-image-supply-chain-attack-architecture.html) | Control Center, compromised container image, mock collector :3002, capture file, optional Floci |
| Attack sequence | [`sequence/sc14-container-image-supply-chain-attack-sequence.html`](sequence/sc14-container-image-supply-chain-attack-sequence.html) | Run compromised image → malicious-start.js → beacon to :3002 |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check).

---

## Verdict in one line

Container supply chain attack works because compromised Dockerfile CMD runs malicious entry point at container startup before legitimate application loads.

This is not runtime exploitation. It is a build-time image layer injection.

---

## Why this lab exists

Public 2025 research describes compromised container images with malicious entry points or layer injections. Attacker modifies Dockerfile CMD or base layers. Scenario 14 runs that on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Compromised container entry point | Dockerfile CMD runs malicious-start.js |
| Runtime beacon at startup | POST http://127.0.0.1:3002/capture |
| Image layer injection | compromised-image/ directory with malicious Dockerfile |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map

1. **Control Center** - registers scenario 14 with port `[3002]`, one service, run step, and one capture URL. Floci optional.

2. **setup.sh** - sources `scenarios/_shared/enable-testbench.sh`.

3. **Compromised image** - Dockerfile CMD runs malicious-start.js at startup. Script gates on `TESTBENCH_MODE` and POSTs to `:3002/capture` with hostname, timestamp, scenario tag.

4. **mock-server.js** - collector on `:3002` that appends POST `/capture` payloads to `captured-data.json`.

5. **Optional Floci** - when Floci helpers load, runtime beacon dual-writes to `s3://scas-sc14-artifacts/`.

---

## Attack chain

### Setup

`./setup.sh` enables testbench before any container runs.

### Run (the attack)

```bash
export TESTBENCH_MODE=enabled
node images/compromised-image/malicious-start.js
```

Container runtime (simulated by node) executes malicious-start.js as entry point.

#### Phase A - Runtime beacon

malicious-start.js checks `TESTBENCH_MODE`, collects hostname, timestamp, scenario tag.

#### Phase B - Beacon

POST to `:3002/capture` (or `host.docker.internal:3002` in Docker).

#### Phase C - Cover story

Container starts "successfully". Legitimate app would load after beacon. Runtime beacon is first action.

---

## Evidence

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Runtime beacon | `GET :3002/captured-data` | One row with scenario 14-container-image tag |

---

## Blue team

Hunt image layer integrity:

- Audit Dockerfile CMD and ENTRYPOINT for unexpected scripts  
- Verify container image layers against known-good digests  
- Monitor unexpected network calls at container startup  

Containment: freeze the image, inspect layers with `docker history`, compare layer SHAs against base image registry, rebuild from trusted sources.

Control that breaks the loop: sign and verify container images with cosign or Docker Content Trust. Inspect entry point before running untrusted images.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/14-container-image-supply-chain-attack/architecture/candidate.json \
  .archify/scenarios/14-container-image-supply-chain-attack/architecture/sc14-container-image-supply-chain-attack-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/14-container-image-supply-chain-attack/sequence/candidate.json \
  .archify/scenarios/14-container-image-supply-chain-attack/sequence/sc14-container-image-supply-chain-attack-sequence.html \
  --repo-root . --quality showcase --json
```
