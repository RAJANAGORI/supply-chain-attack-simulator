# Scenario 05 architecture brief: Build Compromise

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/05-build-compromise`  
Control Center: `http://192.168.1.16:3100/scenarios/05`  
Guide: [Zero-to-Hero Scenario 05](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_05.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc05-build-compromise-architecture.html`](architecture/sc05-build-compromise-architecture.html) | Control Center, build.yml workflow, mutable action tag, CI secrets, mock C2, capture, optional Floci |
| Attack sequence | [`sequence/sc05-build-compromise-sequence.html`](sequence/sc05-build-compromise-sequence.html) | CI runs → action reads secrets → exfiltrate → build passes |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Build compromise turns CI trust into liability because `vendor/build-action@v1` is a mutable tag, and one force-push steals every secret the workflow can read.

---

## Why this lab exists

Real 2024 incidents (GitHub Actions force-push attacks, compromised reusable workflows) showed that workflows pinning actions to mutable tags (`@v1`, `@main`) become vulnerable when attackers force-push malicious code. Scenario 05 copies that mutable-ref pattern on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Workflow pins action to mutable tag | `vendor/build-action@v1` in build.yml |
| Attacker force-pushes to tag | malicious-action/index.js simulates the attack |
| Action reads CI secrets | GITHUB_TOKEN + env vars from plant-lookalike-secrets.sh |
| Exfiltrates to attacker C2 | POST to `http://127.0.0.1:3000/collect` |
| Build completes successfully | CI passes - no visible failure |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 05 with port `3000`, one service, run-ci step, one capture URL, and optional Floci seed/verify. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, plants lookalike CI secrets via `plant-lookalike-secrets.sh`, resets capture log.

3. **build.yml workflow**  
   GitHub Actions workflow in victim-app/.github/workflows/ that uses `vendor/build-action@v1` (mutable tag, not commit SHA).

4. **CI secrets**  
   Planted by setup in victim-app/.env.lab: GITHUB_TOKEN, GITHUB_REPOSITORY, and other CI env vars. Lab fixtures only, not real tokens.

5. **vendor/build-action@v1** (malicious)  
   Simulates force-pushed compromised action. Reads GITHUB_TOKEN and env vars, POSTs to :3000, optionally dual-writes to Floci S3.

6. **Mock C2 server**  
   `infrastructure/mock-server.js` on `:3000` with `POST /collect`, `GET /captured-data`, `DELETE /captured-data`.

7. **Optional Floci**  
   When Floci helpers load, captured data dual-writes to `s3://scas-sc05-artifacts/`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps workflow, secrets, action, mock server, capture, and Floci.  
- Security group **TESTBENCH_MODE=enabled** wraps only the malicious action node. Outside that gate, run() returns immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` plants lookalike secrets in victim-app/.env.lab using `plant-lookalike-secrets.sh`.

### Chain 2 - Start mock server (step 2)

```bash
node infrastructure/mock-server.js
```

Listener must show Running. If `:3000` is down, exfiltration fails quietly.

### Chain 3 - Run CI (the attack)

```bash
export TESTBENCH_MODE=enabled
./run-ci.sh
```

`run-ci.sh` sources .env.lab and runs either `act` (if installed) or `npm run ci` (fallback). Both execute build.yml.

#### Phase A - Workflow starts

GitHub Actions runner (act or npm) starts build.yml. Workflow declares `uses: vendor/build-action@v1`.

#### Phase B - Action runs

Runner executes malicious-action/index.js. Action reads `process.env.GITHUB_TOKEN`, all env vars, and build artifacts.

#### Phase C - Exfiltrate

Action POSTs to `:3000/collect` with CI secrets, env context, and artifacts. Mock server appends to `captured-data.json`. Optional dual-write to Floci S3.

#### Phase D - Cover story

Action completes successfully. Build passes. CI shows green checkmark. Developer sees normal output.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Captured CI secrets | `GET :3000/captured-data` | JSON with GITHUB_TOKEN, env vars, CI context, artifacts |

Control Center Inspector panels map 1:1 to that URL.

Handy curl:

```bash
curl -s http://127.0.0.1:3000/captured-data
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (port, service, floci) | `apps/control-plane/src/registry/scenarios.ts` | 90-100 |
| Workflow YAML with mutable ref | `scenarios/05-build-compromise/victim-app/.github/workflows/build.yml` | 1-30 |
| Malicious action harvest | `scenarios/05-build-compromise/malicious-action/index.js` | 32-90 |
| CI secret planting | `scenarios/_shared/plant-lookalike-secrets.sh` | 1-30 |
| Mock server POST /collect | `scenarios/05-build-compromise/infrastructure/mock-server.js` | 15-46 |
| Setup narrative | `scenarios/05-build-compromise/setup.sh` | 8-48 |

Dirty worktree note when this brief was authored: only untracked `archify_S5.md` (plus Archify output under `.archify/`). Evidence citations are against committed bytes at the pinned revision above.

---

## Blue team / containment talk track

Hunt the correlated shape:

- One workflow YAML with mutable action ref (`@v1`, `@main`, not commit SHA)
- CI run reads secrets (GITHUB_TOKEN, env vars)
- Outbound POST from action step
- Timing correlation: HTTP request during build

Lab helpers: `detection-tools/workflow-injection-scanner.js`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. Pin actions to commit SHAs, not tags: `vendor/build-action@abc123def456`.  
2. Rotate GITHUB_TOKEN and any secrets that appeared in captured-data.json.  
3. Review workflow YAML for all `uses:` lines.  
4. Enable Dependabot version updates for actions.  
5. Use OpenID Connect (OIDC) tokens instead of long-lived secrets when possible.

Control that breaks the loop: SHA-pinned actions, least-privilege tokens, audit logs for workflow changes, runtime network monitoring for unexpected POSTs from CI.

---

## How the surfaces fit together

| Surface | Job |
|---|---|
| Zero-to-Hero guide | Teacher script: why build compromise, mutable refs, CI secret theft, containment lines |
| Control Center `/scenarios/05` | Cockpit: setup → service → run-ci → detect, live logs, one evidence drawer |
| Architecture HTML | Static topology for slides / deep links into source |
| Sequence HTML | Timed CI workflow story for the room |
| This brief (`archify_S5.md`) | Single narrative that ties all of the above |

Same chain everywhere. Guide narrates it. UI executes it. Archify diagrams freeze the shape for reuse.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/05-build-compromise/architecture/candidate.json \
  .archify/scenarios/05-build-compromise/architecture/sc05-build-compromise-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/05-build-compromise/sequence/candidate.json \
  .archify/scenarios/05-build-compromise/sequence/sc05-build-compromise-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this CI compromise story is 06 (Shai-Hulud worm), a different bug class.
