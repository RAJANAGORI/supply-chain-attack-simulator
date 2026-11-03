# Scenario 25 architecture brief: Compromised reusable GitHub Action

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/25-compromised-github-action`  
Control Center: `http://192.168.1.16:3100/scenarios/25`  
Guide: [Zero-to-Hero Scenario 25](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_25.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc25-compromised-github-action-architecture.html`](architecture/sc25-compromised-github-action-architecture.html) | Control Center, ci.yml workflow, force-pushed checkout@v3 action, CI secrets, mock server, optional Floci |
| Attack sequence | [`sequence/sc25-compromised-github-action-sequence.html`](sequence/sc25-compromised-github-action-sequence.html) | CI run → uses action@v3 → scan env secrets → POST to C2 → decoy output |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder's `review-3.2.0/`.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Force-pushing a mutable action tag turns every CI pipeline that uses `@v3` into a credential harvester on the next execution; immutable commit SHAs prevent this.

This is not a GitHub Actions vulnerability. It is a trust model consequence: mutable tags can move. Attacker phishes maintainer, force-pushes the tag, and every workflow using that tag runs attacker code immediately.

---

## Why this lab exists

Reusable GitHub Actions are one of the most trusted pieces of CI/CD infrastructure. A workflow line like `uses: example/actions/checkout@v3` tells GitHub to download and run code from another repository. If an attacker compromises the maintainer account for that action, they can force-push the mutable `v3` tag to a malicious commit. Every pipeline that references the tag will run the attacker's code on the next execution. Scenario 25 models this pattern on localhost:

| Real force-push attack | Lab stand-in |
|---|---|
| Mutable tag `@v3` force-pushed | `example/actions/checkout@v3` in victim ci.yml |
| CI runs malicious action | `nektos/act` binds `@v3` to `.github/actions/checkout` (local malicious copy) |
| Action harvests CI secrets | Reads `GITHUB_TOKEN`, AWS keys, `DATABASE_URL`, Docker credentials from `.env.ci-lab` |
| Exfiltrates to attacker C2 | `POST http://127.0.0.1:3025/collect` |
| CI passes with decoy output | Checkout appears successful; secrets harvested before any alert |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every exfiltration stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 25 with port `[3025]`, mock server, one run step (bash `../run-ci.sh`), and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses. Act binding maps `example/actions/checkout@v3` to local malicious copy.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, resets `infrastructure/captured-data.json`, and plants lookalike CI secrets in `.env.ci-lab`.

3. **ci.yml workflow**  
   Victim pipeline in `victim-app/.github/workflows/ci.yml`. References `uses: example/actions/checkout@v3` (mutable tag). When run with `nektos/act`, the @v3 tag binds to `.github/actions/checkout` (local malicious copy, not real GitHub fetch).

4. **example/actions/checkout@v3** (force-pushed)  
   The compromised action. When workflow runs it, payload scans env for secrets (GITHUB_TOKEN, AWS keys, DATABASE_URL, Docker credentials) and POSTs to `:3025/collect`.

5. **Mock server** (`:3025`)  
   `POST /collect` appends capture entry to `captured-data.json`. `GET /captured-data` returns log. Optional Elasticsearch forwarding uses `SCAS_ES_URL`.

6. **Optional Floci**  
   When Floci helpers load, harvest JSON can dual-write to `s3://scas-sc25-artifacts/`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps ci.yml, CI secrets, compromised action, mock server, captures, and Floci.  
- Security group **TESTBENCH_MODE=enabled** wraps only the action node. Outside that gate, malicious path returns immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` plants lookalike CI secrets in `.env.ci-lab`. Without the secrets, harvest returns empty and the demo looks incomplete.

### Chain 2 - Start mock server (step 2)

`node infrastructure/mock-server.js` must show Running. If `:3025` is down, beacon fails quietly and the Inspector stays empty.

### Chain 3 - Run CI workflow (the attack)

```bash
export TESTBENCH_MODE=enabled
cd victim-app
bash ../run-ci.sh
```

The run-ci.sh script:
- If `nektos/act` is installed: runs `act` with env from `.env.ci-lab`. Act binds `example/actions/checkout@v3` to `.github/actions/checkout` and never fetches from GitHub.
- If `act` is missing or `SCAS_SKIP_ACT=1`: falls back to `npm start` (Node simulator that loads the action with `require()`).

#### Phase A - CI uses action

1. `ci.yml` does `uses: example/actions/checkout@v3`.  
2. Act (or Node simulator) loads `.github/actions/checkout/index.js`.

#### Phase B - Harvest secrets

1. Malicious action scans environment for: `GITHUB_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DATABASE_URL`, `DOCKER_USERNAME`, `DOCKER_PASSWORD`.

#### Phase C - Exfiltrate

1. `POST` harvested JSON to `http://127.0.0.1:3025/collect`.  
2. Mock server appends to `captured-data.json`. Optional Floci dual-write.

#### Phase D - Cover story

1. Return decoy checkout output: "Checked out repository."  
2. CI passes. Logs look normal. Damage is in mock server capture.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Harvested secrets | `GET :3025/captured-data` | One capture entry with env secrets JSON |

Control Center Inspector panel maps to `:3025/captured-data` (see `captures` in `apps/control-plane/src/registry/scenarios.ts`).

Handy curls:

```bash
curl -s http://127.0.0.1:3025/captured-data
cat .env.ci-lab
grep 'uses:.*@v' victim-app/.github/workflows/ci.yml
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (port, captures, act binding) | `apps/control-plane/src/registry/scenarios.ts` | 321-340 |
| Setup script | `scenarios/25-compromised-github-action/setup.sh` | 8-75 |
| victim ci.yml | `scenarios/25-compromised-github-action/victim-app/.github/workflows/ci.yml` | 8-26 |
| Compromised action | `scenarios/25-compromised-github-action/victim-app/.github/actions/checkout/index.js` | 1-30 |
| Mock server endpoint | `scenarios/25-compromised-github-action/README.md` | 76-79 |
| Real-world parallels | `scenarios/25-compromised-github-action/README.md` | 40-53 |

Dirty worktree note when this brief was authored: only untracked `archify_S25.md` (plus Archify output under `.archify/`). Evidence citations are against committed bytes at the pinned revision above.

---

## Blue team / containment talk track

Hunt the force-pushed mutable tag pattern:

- Workflow references action via mutable tag (`@v3`, `@main`)  
- Tag can be force-pushed to any commit  
- CI resolves tag at runtime, pulling attacker code immediately  
- Action harvests env secrets and exfiltrates before returning  

Lab helpers: `detection-tools/` (if present). Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. **Pin actions to commit SHA**, not floating tags: `uses: example/action@<SHA>` instead of `@v3`.  
2. Commit SHAs are immutable. Force-push cannot change them.  
3. **Rotate all exposed secrets**: GITHUB_TOKEN, AWS keys, database passwords, Docker credentials.  
4. **Audit workflow files**: `grep -r 'uses:.*@v' .github/workflows/` to find mutable tag references.  
5. **Runtime network monitoring**: flag unexpected POST from GitHub Actions runners.

Control that breaks the pattern: use GitHub Actions environment protection rules. Secrets only available to approved commits on protected branches. Compromised action runs, but env stays empty.

---

## How the surfaces fit together

| Surface | Job |
|---|---|
| Zero-to-Hero guide | Teacher script: force-push technique, mutable tag danger, SHA pinning mitigation, act simulation |
| Control Center `/scenarios/25` | Cockpit: setup → service → run CI → detect, live logs, one evidence drawer |
| Architecture HTML | Static topology for slides / deep links into source |
| Sequence HTML | Timed CI harvest story for the room |
| This brief (`archify_S25.md`) | Single narrative that ties all of the above |

Same chain everywhere. Guide narrates it. UI executes it. Archify diagrams freeze the shape for reuse.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/25-compromised-github-action/architecture/candidate.json \
  .archify/scenarios/25-compromised-github-action/architecture/sc25-compromised-github-action-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/25-compromised-github-action/sequence/candidate.json \
  .archify/scenarios/25-compromised-github-action/sequence/sc25-compromised-github-action-sequence.html \
  --repo-root . --quality showcase --json
```

This completes the Archify 3.2.0 architecture + sequence diagram set for scenarios 21-25.
