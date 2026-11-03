# Scenario 20 architecture brief: Package version confusion

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/20-package-version-confusion`  
Control Center: `http://192.168.1.16:3100/scenarios/20`  
Guide: [Zero-to-Hero Scenario 20](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_20.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc20-package-version-confusion-architecture.html`](architecture/sc20-package-version-confusion-architecture.html) | Control Center, victim workspace, build-provenance, signed provenance bundles, malicious package, mock C2, capture file |
| Attack sequence | [`sequence/sc20-package-version-confusion-sequence.html`](sequence/sc20-package-version-confusion-sequence.html) | Install → verify provenance → verify attestation → load highest-version malware → beacon |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder's `review-3.2.0/`.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Package version confusion attacks use compromised CI signing keys to publish malicious high-version packages with valid npm provenance and GitHub artifact attestations: signatures prove WHO built the package and integrity, not safety.

This is not "missing signatures." It is CI compromise. Valid provenance does not mean safe code.

---

## Why this lab exists

Public 2024-2025 writeups (npm provenance abuse in StepSecurity notes, `documentation/reference/RESOURCES.md`) describe attacks where compromised CI workflows sign malicious packages with valid provenance and attestation signatures: the attacker controls the CI signing key, publishes a malicious high-version package, and victims verify the valid signatures before loading the malware. Scenario 20 copies that pattern on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Compromised CI workflow | `infrastructure/build-provenance.js` |
| CI signs malicious package | `trusted-logger@9.9.9` with valid provenance |
| Valid npm provenance | `provenance.json` |
| Valid GitHub artifact attestation | `attestation.sigstore.json` |
| Victim verifies signatures | `victim-app/index.js` verifyBundle() |
| Highest version wins | `9.9.9` beats any clean `1.0.0` |
| Beacon from malware | `POST http://127.0.0.1:3020/collect` |

Safety never leaves the box: malware gates on `TESTBENCH_MODE === 'enabled'` and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 20 with port `3020`, one service, install/run steps, and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, runs `build-provenance.js` to generate Ed25519 keypair and sign provenance/attestation for the malicious package, and builds `victim-app` workspace.

3. **build-provenance.js**  
   The compromised CI workflow simulation. Generates Ed25519 keypair, signs `provenance.json` and `attestation.sigstore.json` for `trusted-logger@9.9.9`, and writes the public key for victim verification.

4. **Provenance bundles**  
   `provenance.json` and `attestation.sigstore.json` with valid Ed25519 signatures. Both signatures verify correctly because the CI key is real.

5. **victim-app**  
   Workspace that verifies provenance and attestation signatures before loading `trusted-logger`. Verification passes, highest version `9.9.9` wins, malware loads.

6. **trusted-logger 9.9.9**  
   The malware. Config hard-codes C2 `:3020/collect`. Beacon fires on module load when `TESTBENCH_MODE=enabled`.

7. **Mock C2 server**  
   `infrastructure/mock-server.js` → `captured-data.json`  
   Expects one beacon from `trusted-logger@9.9.9`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps build-provenance, provenance bundles, victim, malware, mock C2, and capture file.  
- Security group **TESTBENCH_MODE=enabled** wraps only the malware node. Outside that gate, no beacon fires.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` runs `build-provenance.js` to generate keys and sign provenance/attestation, then builds `victim-app` workspace.

### Chain 2 - Start listener (step 2)

Mock C2 must show Running. If `:3020` is down, beacons fail quietly and the Inspector stays empty.

### Chain 3 - Install and verify (the attack)

```bash
cd victim-app
export TESTBENCH_MODE=enabled
npm install
npm start
```

`npm start` verifies `provenance.json` and `attestation.sigstore.json` signatures with the public key. Both pass. It verifies the sha512 digest of `index.js`. Match. It loads `trusted-logger@9.9.9` (highest version). Beacon fires.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Provenance-abuse beacon | `GET :3020/captured-data` | One beacon from `trusted-logger@9.9.9` |

Control Center Inspector panel maps 1:1 to that URL (see `captures` in `apps/control-plane/src/registry/scenarios.ts`).

Handy curls:

```bash
curl -s http://127.0.0.1:3020/captured-data
node detection-tools/provenance-abuse-detector.js victim-app
```

Detection script finds behavioral indicators in packages with valid provenance: network requests, file writes, environment variable reads.

---

## Blue team / containment talk track

Hunt the correlated shape, not a package-name string:

- Package with valid npm provenance  
- Package with valid GitHub artifact attestation  
- Highest version wins (9.9.9 beats 1.0.0)  
- Beacon from package despite valid signatures  

Lab helpers: `detection-tools/provenance-abuse-detector.js`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. Revoke compromised CI signing key immediately.  
2. Pin known-good versions in lockfile to prevent highest-version-wins confusion.  
3. Detection: monitor for unexpected version jumps; provenance is identity, not safety proof.

Control that breaks the confusion: pin known-good versions in `package-lock.json`. The attacker can still publish `9.9.9`. npm resolution prefers the pinned version. Attack dies at resolution.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/20-package-version-confusion/architecture/candidate.json \
  .archify/scenarios/20-package-version-confusion/architecture/sc20-package-version-confusion-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/20-package-version-confusion/sequence/candidate.json \
  .archify/scenarios/20-package-version-confusion/sequence/sc20-package-version-confusion-sequence.html \
  --repo-root . --quality showcase --json
```
