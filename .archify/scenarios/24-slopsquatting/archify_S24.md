# Scenario 24 architecture brief: Slopsquatting (LLM-hallucinated packages)

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/24-slopsquatting`  
Control Center: `http://192.168.1.16:3100/scenarios/24`  
Guide: [Zero-to-Hero Scenario 24](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_24.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc24-slopsquatting-architecture.html`](architecture/sc24-slopsquatting-architecture.html) | Control Center, victim app, hallucinated array-sortify package, mock server, capture files |
| Attack sequence | [`sequence/sc24-slopsquatting-sequence.html`](sequence/sc24-slopsquatting-sequence.html) | npm start → import → import-time exfil → app OK with working functionality |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder's `review-3.2.0/`.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

LLMs confidently generate plausible package names that do not exist; attackers publish malicious packages under those hallucinated names; developers install without verifying.

This is not a typo. It is slopsquatting: exploiting AI-generated recommendations instead of human typos.

---

## Why this lab exists

As LLMs become primary coding assistants, they generate code snippets with package names that sound real but do not exist. Attackers monitor for these hallucinated names, register them, and publish malicious packages before developers realize the name was invented. Scenario 24 models this pattern on localhost:

| Real slopsquatting claim | Lab stand-in |
|---|---|
| LLM suggests plausible package name | `array-sortify` sounds like a real utility |
| Developer installs without checking npm registry | `npm install array-sortify` from LLM suggestion |
| Package provides working functionality | Sorting works; app behavior looks normal |
| Import-time payload | Exfiltrates env data to `http://127.0.0.1:3024/collect` |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 24 with port `[3024]`, mock server, install/run steps, and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, resets `infrastructure/captured-data.json`, and installs victim-app dependencies (which includes malicious `array-sortify`).

3. **victim-app**  
   Depends on `array-sortify` (local file: dep in the lab). When app does `require('array-sortify')`, import-time payload runs before app logic.

4. **array-sortify** (hallucinated name)  
   The slopsquat package. Provides working sorting functionality so app behavior looks normal, but also runs payload on import: writes env data, POSTs to `:3024/collect`.

5. **Mock server** (`:3024`)  
   `POST /collect` appends capture entry to `captured-data.json`. `GET /captured-data` returns log. Optional Elasticsearch forwarding uses `SCAS_ES_URL`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps victim, hallucinated package, mock server, and capture files.  
- Security group **TESTBENCH_MODE=enabled** wraps only the payload node. Outside that gate, malicious path returns immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` installs victim-app dependencies. The LLM hallucination happened before setup: developer asked assistant for sorting utility, LLM suggested `array-sortify`, developer added to `package.json` without verifying.

### Chain 2 - Start mock server (step 2)

`node infrastructure/mock-server.js` must show Running. If `:3024` is down, beacon fails quietly and the Inspector stays empty.

### Chain 3 - Run app (the attack)

```bash
export TESTBENCH_MODE=enabled
cd victim-app
npm start
```

#### Phase A - Import-time execution

1. `npm start` does `node -r ../../_shared/testbench-env.js index.js`.  
2. `index.js` does `require('array-sortify')`.  
3. Malicious code in package entry runs before app logic: reads env data, POSTs to `:3024/collect`.

#### Phase B - Cover story

1. `array-sortify` returns working sorting functionality.  
2. App runs normally; sorting works.  
3. Developer sees no error; app behavior matches expectations.  
4. Damage is in beacon capture.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Exfiltration | `GET :3024/captured-data` | One capture entry with env data JSON |

Control Center Inspector panel maps to `:3024/captured-data` (see `captures` in `apps/control-plane/src/registry/scenarios.ts`).

Handy curls:

```bash
curl -s http://127.0.0.1:3024/captured-data
npm view array-sortify  # check if real (should fail in real registry)
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (port, captures) | `apps/control-plane/src/registry/scenarios.ts` | 317-320 |
| Setup script | `scenarios/24-slopsquatting/setup.sh` | 8-42 |
| victim-app package.json | `scenarios/24-slopsquatting/victim-app/package.json` | 1-14 |
| README hallucination pattern | `scenarios/24-slopsquatting/README.md` | 40-50 |
| Mock server endpoint | `scenarios/24-slopsquatting/README.md` | 74-77 |

Dirty worktree note when this brief was authored: only untracked `archify_S24.md` (plus Archify output under `.archify/`). Evidence citations are against committed bytes at the pinned revision above.

---

## Blue team / containment talk track

Hunt the slopsquatting pattern:

- Developer added package from LLM suggestion without verifying registry existence  
- Package has very low or zero weekly downloads (new publish)  
- Package import runs code before returning functionality  
- Network POST during import-time  

Lab helpers: `detection-tools/` (if present). Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. **Before `npm install`, verify package exists**: `npm view <package>` or check npmjs.com.  
2. **Check weekly downloads, last publish date, GitHub stars**. New packages with zero downloads are suspect.  
3. **Review LLM-generated code before running**. Do not blindly copy-paste install commands.  
4. **Use allowlists in production**: lock down registry access to known-good packages only.  
5. **Monitor network during development**: flag unexpected POST requests during import/require.

Control that breaks the pattern: use `--registry` flag to point to a curated internal registry. Packages not in the allowlist cannot install. LLM-hallucinated names fail to resolve.

---

## How the surfaces fit together

| Surface | Job |
|---|---|
| Zero-to-Hero guide | Teacher script: slopsquatting definition, LLM hallucination risk, verification checklist |
| Control Center `/scenarios/24` | Cockpit: setup → service → run → detect, live logs, one evidence drawer |
| Architecture HTML | Static topology for slides / deep links into source |
| Sequence HTML | Timed import-time story for the room |
| This brief (`archify_S24.md`) | Single narrative that ties all of the above |

Same chain everywhere. Guide narrates it. UI executes it. Archify diagrams freeze the shape for reuse.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/24-slopsquatting/architecture/candidate.json \
  .archify/scenarios/24-slopsquatting/architecture/sc24-slopsquatting-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/24-slopsquatting/sequence/candidate.json \
  .archify/scenarios/24-slopsquatting/sequence/sc24-slopsquatting-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this LLM-hallucination attack is 25 (Compromised GitHub Action), another reusable-component compromise.
