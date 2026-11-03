# Scenario 23 architecture brief: Trivy supply chain attack (CVE-2026-33634)

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/23-trivy-supply-chain-attack`  
Control Center: `http://192.168.1.16:3100/scenarios/23`  
Guide: [Zero-to-Hero Scenario 23](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_23.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc23-trivy-supply-chain-attack-architecture.html`](architecture/sc23-trivy-supply-chain-attack-architecture.html) | Control Center, victim-ci pipeline, compromised trivy-action-like@0.69.4, CI secrets, mock C2 server, optional Floci |
| Attack sequence | [`sequence/sc23-trivy-supply-chain-attack-sequence.html`](sequence/sc23-trivy-supply-chain-attack-sequence.html) | CI run → load scanner → scan env secrets → POST to C2 → decoy output |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder's `review-3.2.0/`.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

A compromised security scanner turns the trusted tool that finds vulnerabilities into the vulnerability itself: force-pushed tag exfiltrates CI secrets before returning decoy scan output.

This is not theoretical. It is the real CVE-2026-33634 pattern (March 2026 Aqua Security Trivy compromise): force-push mutable tag, harvest env secrets, use typosquatted domain for C2.

---

## Why this lab exists

The March 2026 Trivy compromise (CVE-2026-33634, documented in `documentation/reference/RESOURCES.md`) represents one of the most significant supply chain attacks in recent history. TeamPCP compromised Aqua Security's Trivy vulnerability scanner and force-pushed 76 of 77 version tags to malicious commits. Scenario 23 models the attack pattern on localhost:

| Real CVE-2026-33634 claim | Lab stand-in |
|---|---|
| Force-pushed @v0.69.4 tag | `trivy-action-like@0.69.4` in victim-ci dependencies |
| Scanned env for secrets | Reads `GITHUB_TOKEN`, AWS keys, `DATABASE_URL`, Docker credentials from `.env.ci-lab` |
| Exfiltrated to typosquatted domain | `POST http://127.0.0.1:3023/collect` |
| Returned decoy scan output | CI passes; secrets harvested before any alert |
| Multiple distribution channels | GitHub Releases, Docker Hub, GHCR, ECR (lab: local file: dep) |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every exfiltration stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 23 with port `[3023]`, one mock C2 service, install/run steps (victim-ci folder, not victim-app), and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, installs victim-ci dependencies (which pulls in compromised `trivy-action-like@0.69.4`), and plants lookalike CI secrets in `.env.ci-lab`.

3. **victim-ci** (not victim-app)  
   CI pipeline runner. `package.json` exposes `"ci": "node run-pipeline.js"`, not `"start"`. The run step sources `.env.ci-lab` and runs `npm run ci`.

4. **trivy-action-like@0.69.4**  
   The compromised scanner. When CI requires it, payload scans env for secrets (GITHUB_TOKEN, AWS keys, DATABASE_URL, Docker credentials) and POSTs to `:3023/collect`.

5. **Mock C2 server** (`:3023`)  
   `POST /collect` appends capture entry to `captured-data.json`. `GET /captured-data` returns log. Optional Elasticsearch forwarding uses `SCAS_ES_URL`.

6. **Optional Floci**  
   When Floci helpers load, harvest JSON can dual-write to `s3://scas-sc23-artifacts/`. Registry entry includes `floci: { seed, verify }`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps victim-ci, CI secrets, compromised scanner, C2 server, captures, and Floci.  
- Security group **TESTBENCH_MODE=enabled** wraps only the scanner node. Outside that gate, malicious path returns immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` installs victim-ci dependencies (materializes compromised `trivy-action-like@0.69.4`) and plants lookalike CI secrets. Without the secrets, harvest returns empty and the demo looks incomplete.

### Chain 2 - Start C2 server (step 2)

`node infrastructure/mock-c2-server.js` must show Running. If `:3023` is down, exfiltration fails quietly and the Inspector stays empty.

### Chain 3 - Run CI pipeline (the attack)

```bash
export TESTBENCH_MODE=enabled
set -a && source .env.ci-lab && set +a
cd victim-ci
node run-pipeline.js
```

#### Phase A - CI loads scanner

1. `run-pipeline.js` does `require('trivy-action-like')`.  
2. Compromised scanner code executes before returning decoy scan output.

#### Phase B - Harvest secrets

1. Scan environment for: `GITHUB_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DATABASE_URL`, `DOCKER_USERNAME`, `DOCKER_PASSWORD`.  
2. Also scan for SSH keys, K8s tokens, Docker configs (real CVE scope; lab subset for clarity).

#### Phase C - Exfiltrate

1. `POST` harvested JSON to `http://127.0.0.1:3023/collect`.  
2. C2 server appends to `captured-data.json`. Optional Floci dual-write.

#### Phase D - Cover story

1. Return decoy scan output: "Trivy scan complete. No vulnerabilities found."  
2. CI passes. Logs look normal. Damage is in C2 capture.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Harvested secrets | `GET :3023/captured-data` | One capture entry with env secrets JSON |

Control Center Inspector panel maps to `:3023/captured-data` (see `captures` in `apps/control-plane/src/registry/scenarios.ts`).

Handy curls:

```bash
curl -s http://127.0.0.1:3023/captured-data
cat .env.ci-lab
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (ports, services, captures, Floci) | `apps/control-plane/src/registry/scenarios.ts` | 301-316 |
| Setup script | `scenarios/23-trivy-supply-chain-attack/setup.sh` | 8-42 |
| victim-ci ci script | `scenarios/23-trivy-supply-chain-attack/victim-ci/package.json` | 6-8 |
| Compromised scanner payload description | `scenarios/23-trivy-supply-chain-attack/README.md` | 61-70 |
| Mock C2 server | `scenarios/23-trivy-supply-chain-attack/infrastructure/mock-c2-server.js` | 24-48 |
| CVE-2026-33634 timeline | `scenarios/23-trivy-supply-chain-attack/README.md` | 46-59 |

Dirty worktree note when this brief was authored: only untracked `archify_S23.md` (plus Archify output under `.archify/`). Evidence citations are against committed bytes at the pinned revision above.

---

## Blue team / containment talk track

Hunt the trusted-tool compromise pattern:

- CI pipeline loads a security scanner (Trivy, KICS, Semgrep)  
- Scanner process reads env vars or secret files  
- Scanner process POSTs to external endpoint (not registry, not CDN)  
- CI passes; no visible failure

Lab helpers: `detection-tools/trivy-version-scanner.js`, `ci-workflow-auditor.js`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. **Pin actions to commit SHA**, not floating tags: `uses: aquasecurity/trivy-action@<SHA>` instead of `@v0.69.4`.  
2. Commit SHAs are immutable. Force-push cannot change them.  
3. **Rotate all exposed secrets**: GITHUB_TOKEN, AWS keys, database passwords, Docker credentials.  
4. **Audit action references**: `grep -r 'uses:.*@v' .github/workflows/` to find mutable tags.  
5. **Runtime network monitoring**: flag unexpected POST from security tools in CI.

Control that breaks the pattern: use GitHub Actions environment protection rules. Secrets only available to approved commits on protected branches. Compromised action runs, but env stays empty.

---

## How the surfaces fit together

| Surface | Job |
|---|---|
| Zero-to-Hero guide | Teacher script: CVE-2026-33634 timeline, force-push technique, mutable tag danger, SHA pinning mitigation |
| Control Center `/scenarios/23` | Cockpit: setup → service → run CI → detect, live logs, one evidence drawer |
| Architecture HTML | Static topology for slides / deep links into source |
| Sequence HTML | Timed CI harvest story for the room |
| This brief (`archify_S23.md`) | Single narrative that ties all of the above |

Same chain everywhere. Guide narrates it. UI executes it. Archify diagrams freeze the shape for reuse.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/23-trivy-supply-chain-attack/architecture/candidate.json \
  .archify/scenarios/23-trivy-supply-chain-attack/architecture/sc23-trivy-supply-chain-attack-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/23-trivy-supply-chain-attack/sequence/candidate.json \
  .archify/scenarios/23-trivy-supply-chain-attack/sequence/sc23-trivy-supply-chain-attack-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this trusted-tool compromise is 24 (Slopsquatting), a different attack vector.
