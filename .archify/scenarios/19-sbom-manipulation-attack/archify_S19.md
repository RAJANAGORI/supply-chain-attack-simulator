# Scenario 19 architecture brief: SBOM manipulation attack

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/19-sbom-manipulation-attack`  
Control Center: `http://192.168.1.16:3100/scenarios/19`  
Guide: [Zero-to-Hero Scenario 19](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_19.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc19-sbom-manipulation-attack-architecture.html`](architecture/sc19-sbom-manipulation-attack-architecture.html) | Control Center, victim workspace, SBOM generator, truth oracle, omitted dependencies, mock C2, capture file, optional Floci |
| Attack sequence | [`sequence/sc19-sbom-manipulation-attack-sequence.html`](sequence/sc19-sbom-manipulation-attack-sequence.html) | Generate SBOM → read truth → omit dependencies → POST sbom-exfil → complete |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder's `review-3.2.0/`.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

SBOM manipulation attacks use malicious SBOM generators to omit compromised dependencies from the software bill of materials, making detection and supply chain audits incomplete.

This is not "missing documentation." It is deliberate omission. The truth oracle proves what was hidden.

---

## Why this lab exists

Public 2024-2025 writeups (SBOM manipulation in StepSecurity notes, `documentation/reference/RESOURCES.md`) describe malicious SBOM generators that intentionally omit compromised dependencies from the generated SBOM: attackers control the SBOM generation tooling and filter out packages they want to hide. Scenario 19 copies that pattern on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Malicious SBOM generator | `sbom/malicious-sbom-generator.js` |
| Generator reads complete dependency list | `truth/dependencies.json` |
| Generator omits malicious dependencies | `generateSbom({ omitDependencies })` |
| Generated SBOM is incomplete | `victim-app/sbom.json` |
| Exfil proves manipulation | `POST http://127.0.0.1:3019/collect` |

Safety never leaves the box: generator gates on `TESTBENCH_MODE === 'enabled'` and every exfil stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 19 with port `3019`, one service, install/run steps, and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, creates the truth oracle `truth/dependencies.json`, and builds `victim-app` workspace.

3. **victim-app**  
   Workspace that generates an SBOM. `npm start` runs the malicious SBOM generator, which reads the truth oracle, omits specified dependencies, and writes `sbom.json`.

4. **truth/dependencies.json**  
   The oracle. Contains the complete dependency list including dependencies the generator will omit. This is the baseline for detection.

5. **malicious-sbom-generator.js**  
   The malware. Reads `truth/dependencies.json`, filters out specified dependencies, and writes the incomplete `sbom.json`. Exfils the omit proof to `:3019/collect`.

6. **Omitted dependency**  
   A placeholder representing the dependencies filtered out of the SBOM. The truth oracle includes them; `sbom.json` does not.

7. **Mock C2 server**  
   `infrastructure/mock-server.js` → `captured-data.json`  
   Expects one sbom-exfil capture with omit proof.

8. **Optional Floci**  
   When Floci helpers load, sbom-exfil JSON can dual-write to `s3://scas-sc19-artifacts/`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps victim, truth oracle, SBOM generator, omitted dependency, mock C2, capture file, and Floci.  
- Security group **TESTBENCH_MODE=enabled** wraps only the generator node. Outside that gate, no omission or exfil occurs.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` creates the truth oracle `truth/dependencies.json` and victim workspace before anything "malicious" runs.

### Chain 2 - Start listener (step 2)

Mock C2 must show Running. If `:3019` is down, exfils fail quietly and the Inspector stays empty.

### Chain 3 - Generate SBOM (the attack)

```bash
cd victim-app
export TESTBENCH_MODE=enabled
npm install
npm start
```

`npm start` runs the malicious SBOM generator, which reads `truth/dependencies.json`, omits specified dependencies, writes the incomplete `sbom.json`, and POSTs sbom-exfil with omit proof.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| SBOM omit exfil | `GET :3019/captured-data` | One sbom-generation capture with omit proof |

Control Center Inspector panel maps 1:1 to that URL (see `captures` in `apps/control-plane/src/registry/scenarios.ts`).

Handy curls:

```bash
curl -s http://127.0.0.1:3019/captured-data
node detection-tools/sbom-manipulation-validator.js victim-app
```

Detection script compares `sbom.json` vs `truth/dependencies.json` to find omitted dependencies.

---

## Blue team / containment talk track

Hunt the correlated shape, not a package-name string:

- SBOM generation process  
- SBOM generator reads truth file  
- Generated SBOM missing dependencies in truth  
- Exfil with omit proof  

Lab helpers: `detection-tools/sbom-manipulation-validator.js`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. Regenerate SBOM with trusted tool; compare `sbom.json` vs `truth/dependencies.json`.  
2. Detection: SBOM validation tools that diff declared vs truth dependencies.  
3. Hunt for dependencies in truth but missing from SBOM.

Control that breaks the manipulation: use trusted SBOM generation tooling from CI with verified checksums. The attacker can still run their generator. It cannot write the official SBOM. Attack dies at generation.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/19-sbom-manipulation-attack/architecture/candidate.json \
  .archify/scenarios/19-sbom-manipulation-attack/architecture/sc19-sbom-manipulation-attack-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/19-sbom-manipulation-attack/sequence/candidate.json \
  .archify/scenarios/19-sbom-manipulation-attack/sequence/sc19-sbom-manipulation-attack-sequence.html \
  --repo-root . --quality showcase --json
```
