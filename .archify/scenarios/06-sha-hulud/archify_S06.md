# Scenario 06 architecture brief: Shai-Hulud worm

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/06-sha-hulud`  
Control Center: `http://192.168.1.16:3100/scenarios/06`  
Guide: [Zero-to-Hero Scenario 06](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_06.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc06-sha-hulud-architecture.html`](architecture/sc06-sha-hulud-architecture.html) | Control Center, victim workspace, worm, three localhost listeners, capture files, optional Floci |
| Attack sequence | [`sequence/sc06-sha-hulud-sequence.html`](sequence/sc06-sha-hulud-sequence.html) | Install → harvest → lockfile discovery → publish x4 → backdoor PR x4 → complete |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder's `review-3.2.0/`.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Shai-Hulud spreads because a publish token on a laptop turns one `npm install` into the ability to poison every package that token can write, and the next install does it again.

This is not "one bad package." It is a worm. Credentials move it. Not magic.

---

## Why this lab exists

Public 2025 writeups (chalk / debug / `@ctrl/tinycolor` family, StepSecurity notes in `documentation/reference/RESOURCES.md`) describe install-time scripts that steal maintainer tokens and republish other packages those tokens can write. Scenario 06 copies that loop on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Tokens read from maintainer machine | Fixtures in `victim-app/.npmrc`, `victim-app/.env`, `~/.git-credentials` |
| Secrets sent to attacker | `POST http://127.0.0.1:3001/collect` |
| Malicious `npm publish` | `POST http://127.0.0.1:3003/publish` |
| Stolen GitHub token writes to repos | `POST http://127.0.0.1:3002/backdoor-pr` |
| Every package the token can publish | Four `@victim-org/*` names in `package-lock.json` |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 06 with ports `[3001, 3002, 3003]`, three services, install/run steps, and three capture URLs. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, builds `malicious-packages/shai-hulud/` (including `postinstall` from the template), creates the four `@victim-org` workspace packages, and plants lookalike tokens.

3. **victim-app**  
   Workspace that depends on `shai-hulud` plus `@victim-org/victim-utils`, `victim-api`, `victim-logger`, `victim-auth`. `npm start` still greets normally after compromise. That quiet success is the cover.

4. **shai-hulud postinstall.js**  
   The worm. Config hard-codes harvester `:3001/collect`, registry `:3003/publish`, GitHub sim `:3002/backdoor-pr`. Scope default `@victim-org`. Cap `maxInfectionsPerInstall: 10`.

5. **Three mock listeners**  
   - `credential-harvester.js` → `captured-credentials.json`  
   - `github-actions-simulator.js` → `backdoor-prs.json` (also runs fake CI checks on the PR payload)  
   - `mock-registry.js` → `published-packages.json` + `registry-db.json` (validates Bearer token shape)

6. **Optional Floci**  
   When Floci helpers load, harvest JSON can dual-write to `s3://scas-sc06-artifacts/`. Optional Elasticsearch forwarding uses `SCAS_ES_URL` on the harvester process.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps victim, worm, fixtures, mocks, and capture files.  
- Security group **TESTBENCH_MODE=enabled** wraps only the worm node. Outside that gate, `run()` returns immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` plants loot before anything "malicious" runs. Without fixtures, Phase A finds nothing and the demo looks empty for the wrong reason.

### Chain 2 - Start listeners (step 2)

All three services must show Running. If `:3001` is down, harvest fails quietly and the Inspector stays empty. Same lesson as production: you only see what arrived.

### Chain 3 - Install (the attack)

```bash
cd victim-app
export TESTBENCH_MODE=enabled
npm install
```

npm runs `postinstall` before the app starts. That is the real-world install-time pattern.

#### Phase A - Harvest before republish

1. Read `~/.npmrc` (fallback project `.npmrc`) for `_authToken`.  
2. Read `~/.git-credentials` (fallback `.env`) for `ghp_...`.  
3. `POST` `event: token_harvest` to `:3001/collect`.

Detectors that only watch registry publishes miss the theft. Harvest is first on purpose.

#### Phase B - Discover targets

`discoverTargetPackages` walks `package-lock.json` / `npm-shrinkwrap.json` for names under `@victim-org/`. Not a hardcoded list. Expected four:

| Package | From | Pretend bump |
|---|---|---|
| `@victim-org/victim-utils` | `1.0.0` | `1.0.1` |
| `@victim-org/victim-api` | `2.1.0` | `2.1.1` |
| `@victim-org/victim-logger` | `0.5.2` | `0.5.3` |
| `@victim-org/victim-auth` | `3.2.1` | `3.2.2` |

#### Phase C - Fan-out

For each target:

1. `POST /publish` on `:3003` with `Authorization: Bearer <npm token>` and `injectedScript: node postinstall.js`.  
2. `POST /backdoor-pr` on `:3002` for repo slug `victim-org/<pkg>`, branch `feat/dependency-bump`, files touching `package.json` and new `postinstall.js`.

Then `POST /collect` again with `event: propagation_complete`, expecting `packagesDiscovered` and `packagesInfecting` both equal to 4.

Worm loop in one sentence:

```
install → steal tokens → find org packages in lockfile → republish each → open backdoor PRs → report done
         └────────── next victim installs infected version → repeat ──────────┘
```

#### Phase D - Cover story

`npm start` still works. Local `packages/*/package.json` files still have **no** `postinstall`. Working tree looks fine. Damage is in mock registry history and the PR log.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Harvested credentials | `GET :3001/captured-credentials` | First `token_harvest`, later `propagation_complete` with counts = 4 |
| Republished packages | `GET :3003/published-packages` | Four `malicious_publish` rows with the patch bumps above |
| Backdoor PRs | `GET :3002/backdoor-prs` | Four repos, branch `feat/dependency-bump` |

Control Center Inspector panels map 1:1 to those URLs (see `captures` in `apps/control-plane/src/registry/scenarios.ts`).

Handy curls:

```bash
curl -s http://127.0.0.1:3001/captured-credentials
curl -s http://127.0.0.1:3003/published-packages
curl -s http://127.0.0.1:3002/backdoor-prs
node detection-tools/worm-status.js .
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (ports, services, captures) | `apps/control-plane/src/registry/scenarios.ts` | 121-142 |
| Worm CONFIG URLs | `scenarios/06-sha-hulud/malicious-packages/shai-hulud/postinstall.js` | 27-40 |
| TESTBENCH gate + harvest | same | 310-363 |
| Lockfile discovery | same | 140-201 |
| Publish + backdoor loop | same | 380-463 |
| Harvester `/collect` | `scenarios/06-sha-hulud/infrastructure/credential-harvester.js` | 12-59 |
| Mock registry publish | `scenarios/06-sha-hulud/infrastructure/mock-registry.js` | 15-66 |
| GitHub sim + CI checks | `scenarios/06-sha-hulud/infrastructure/github-actions-simulator.js` | 15-56 |
| Setup narrative + package layout | `scenarios/06-sha-hulud/setup.sh` | 8-61 |
| Victim still loads packages | `scenarios/06-sha-hulud/victim-app/index.js` | 1-20 |
| Detection IOCs | `scenarios/06-sha-hulud/DETECT.md` | full runbook |

Dirty worktree note when this brief was authored: only untracked `archify_S6.md` (plus Archify output under `.archify/`). Evidence citations are against committed bytes at the pinned revision above.

---

## Blue team / containment talk track

Hunt the correlated shape, not a package-name string:

- One `npm` process  
- Reads credential files (`.npmrc`, `.git-credentials`, `.env`)  
- Then N outbound POSTs where N matches `@victim-org` count in the lockfile  

Lab helpers: `detection-tools/postinstall-monitor.js`, `credential-scanner.js`, `worm-status.js`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. Revoke npm + GitHub tokens. Assume every package that token could publish is suspect (here: the four `@victim-org` names).  
2. `npm uninstall shai-hulud`, then `npm ci --ignore-scripts`.  
3. Freeze publishes; inspect versions that appeared in the install window (`published-packages.json` timestamps).  
4. Review backdoor PRs (`backdoor-prs.json` in the lab).

Control that breaks the loop: publish tokens live in CI secrets only, never in a developer home directory. The `postinstall` can still run. It finds nothing worth republishing. Worm dies at victim one.

---

## How the surfaces fit together

| Surface | Job |
|---|---|
| Zero-to-Hero guide | Teacher script: why Shai-Hulud, phase order, four-package proof, containment lines |
| Control Center `/scenarios/06` | Cockpit: setup → 3 services → install → run → detect, live logs, three evidence drawers |
| Architecture HTML | Static topology for slides / deep links into source |
| Sequence HTML | Timed install-time story for the room |
| This brief (`archify_S6.md`) | Single narrative that ties all of the above |

Same chain everywhere. Guide narrates it. UI executes it. Archify diagrams freeze the shape for reuse.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/06-sha-hulud/architecture/candidate.json \
  .archify/scenarios/06-sha-hulud/architecture/sc06-sha-hulud-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/06-sha-hulud/sequence/candidate.json \
  .archify/scenarios/06-sha-hulud/sequence/sc06-sha-hulud-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this worm story is 07 (transitive `data-processor`), a different bug class.
