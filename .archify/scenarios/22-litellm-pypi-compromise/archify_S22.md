# Scenario 22 architecture brief: LiteLLM-style PyPI compromise

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/22-litellm-pypi-compromise`  
Control Center: `http://192.168.1.16:3100/scenarios/22`  
Guide: [Zero-to-Hero Scenario 22](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_22.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc22-litellm-pypi-compromise-architecture.html`](architecture/sc22-litellm-pypi-compromise-architecture.html) | Control Center, victim venv, two payload vectors (import-time 1.82.7 vs .pth startup 1.82.8), Python mock server, capture files |
| Attack sequence | [`sequence/sc22-litellm-pypi-compromise-sequence.html`](sequence/sc22-litellm-pypi-compromise-sequence.html) | pip install → Vector A (import-time) → Vector B (.pth startup hook) |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder's `review-3.2.0/`.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

A compromised Python package can execute malicious code either at import-time (1.82.7) or via a .pth file that runs at Python interpreter startup before any imports (1.82.8).

This is not npm-specific. It is the PyPI account compromise pattern from real incidents (LiteLLM 2026, documented in issue #4): two execution vectors, same compromise window.

---

## Why this lab exists

Public 2026 writeups (PyPI account compromise pattern, documented in `documentation/reference/RESOURCES.md`) describe two Python execution vectors attackers use after package takeover. Scenario 22 models both on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Malicious code on import | `litellm_like` 1.82.7 runs payload when app does `import litellm_like` |
| .pth startup hook | `litellm_like` 1.82.8 installs `zzz_testbench_litellm_like.pth` in site-packages; runs before any import |
| Exfiltration endpoint | `POST http://127.0.0.1:3022/collect` |
| IOC markers | `.testbench-litellm-import.json` (1.82.7) and `.testbench-litellm-pth.json` (1.82.8) |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 22 with port `[3022]`, one Python service, install/run steps, and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, creates victim-app venv with fallback logic (venv → venv --without-pip + get-pip → virtualenv → uv).

3. **victim-app**  
   Python venv workspace. `pip install` materializes either 1.82.7 or 1.82.8. `python run_victim.py` imports litellm_like and shows the attack vector.

4. **litellm_like 1.82.7** (import-time)  
   When app does `import litellm_like`, malicious code runs before app logic. Writes `.testbench-litellm-import.json`, POSTs to `:3022/collect`.

5. **litellm_like 1.82.8** (.pth startup hook)  
   `pip install` adds `zzz_testbench_litellm_like.pth` to site-packages. Python interpreter reads .pth files at startup, before any imports. Writes `.testbench-litellm-pth.json`, POSTs to `:3022/collect`.

6. **Python mock server** (`:3022`, stdlib HTTP)  
   `POST /collect` appends event to `captured-data.json`. `GET /captured-data` returns log. Optional Elasticsearch forwarding uses `SCAS_ES_URL`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps victim, both payload vectors, mock server, and capture files.  
- Security group **TESTBENCH_MODE=enabled** wraps both payload nodes. Outside that gate, malicious paths return immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` creates victim-app venv. Without the venv, pip install has no isolated target.

### Chain 2 - Start mock server (step 2)

`python3 infrastructure/mock_server.py` must show Running. If `:3022` is down, beacons fail quietly and the Inspector stays empty.

### Chain 3 - Install + run (the attack)

Two paths: Vector A (1.82.7 import-time) and Vector B (1.82.8 .pth startup).

#### Vector A - Import-time execution (1.82.7)

```bash
export TESTBENCH_MODE=enabled
cd victim-app
source .venv/bin/activate
pip install -U ../python-packages/v1_82_7
python run_victim.py
```

1. `pip install` materializes litellm_like 1.82.7.  
2. `python run_victim.py` does `import litellm_like`.  
3. Malicious code in `__init__.py` runs before app logic: writes `.testbench-litellm-import.json`, POSTs to `:3022/collect`.  
4. App continues normally; the payload already ran.

#### Vector B - .pth startup hook (1.82.8)

```bash
export TESTBENCH_MODE=enabled
cd victim-app
source .venv/bin/activate
pip install -U ../python-packages/v1_82_8
python run_victim.py
```

1. `pip install` with `TESTBENCH_MODE=enabled` adds `zzz_testbench_litellm_like.pth` to `.venv/lib/python3.X/site-packages/`.  
2. `python run_victim.py` starts the interpreter.  
3. Python reads .pth files at startup, before any imports. The .pth file imports `litellm_like_pth_hook`, which runs the payload: writes `.testbench-litellm-pth.json`, POSTs to `:3022/collect`.  
4. App imports and runs normally; the payload already ran at startup.

#### Phase C - Cover story

Both vectors still provide working `litellm_like` functionality. The app runs normally. Damage is in beacon captures and IOC files.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Events | `GET :3022/captured-data` | One import event (1.82.7) or one startup event (1.82.8) |
| Import IOC | `.testbench-litellm-import.json` in victim-app | File exists for 1.82.7 path |
| .pth IOC | `.testbench-litellm-pth.json` in victim-app | File exists for 1.82.8 path |

Control Center Inspector panel maps to `:3022/captured-data` (see `captures` in `apps/control-plane/src/registry/scenarios.ts`).

Handy curls:

```bash
curl -s http://127.0.0.1:3022/captured-data
cat victim-app/.testbench-litellm-import.json
cat victim-app/.testbench-litellm-pth.json
find victim-app/.venv -name '*.pth' -type f
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (ports, services, captures) | `apps/control-plane/src/registry/scenarios.ts` | 264-300 |
| Setup venv creation | `scenarios/22-litellm-pypi-compromise/setup.sh` | 8-70 |
| README two vectors | `scenarios/22-litellm-pypi-compromise/README.md` | 40-53 |
| Python mock server | `scenarios/22-litellm-pypi-compromise/infrastructure/mock_server.py` | 65-90 |
| Release behaviors table | `scenarios/22-litellm-pypi-compromise/README.md` | 46-52 |

Dirty worktree note when this brief was authored: only untracked `archify_S22.md` (plus Archify output under `.archify/`). Evidence citations are against committed bytes at the pinned revision above.

---

## Blue team / containment talk track

Hunt the Python execution vectors:

- **Import-time**: malicious code in package `__init__.py` or top-level module that runs on `import`.  
- **.pth startup**: unexpected .pth files in site-packages that run before any imports.

Lab helpers: `detection-tools/` (if present). Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. Uninstall compromised package: `pip uninstall litellm_like`.  
2. Rebuild venv: `rm -rf .venv && python3 -m venv .venv && source .venv/bin/activate`.  
3. Pin known-good version: `pip install litellm_like==1.82.6`.  
4. Rotate all secrets exposed to the Python environment (env vars, config files).  
5. Site-packages triage: `find .venv -name '*.pth' -type f` and review for unexpected .pth files.

Control that breaks the pattern: use `--require-hashes` in CI environments. Every `pip install` must match a SHA256. A compromised release with different hashes fails to install.

---

## How the surfaces fit together

| Surface | Job |
|---|---|
| Zero-to-Hero guide | Teacher script: why two Python vectors, .pth startup mechanics, site-packages triage |
| Control Center `/scenarios/22` | Cockpit: setup → service → install → run, live logs, one evidence drawer |
| Architecture HTML | Static topology for slides / deep links into source |
| Sequence HTML | Timed Python execution story for the room |
| This brief (`archify_S22.md`) | Single narrative that ties all of the above |

Same chain everywhere. Guide narrates it. UI executes it. Archify diagrams freeze the shape for reuse.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/22-litellm-pypi-compromise/architecture/candidate.json \
  .archify/scenarios/22-litellm-pypi-compromise/architecture/sc22-litellm-pypi-compromise-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/22-litellm-pypi-compromise/sequence/candidate.json \
  .archify/scenarios/22-litellm-pypi-compromise/sequence/sc22-litellm-pypi-compromise-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this Python compromise is 23 (Trivy supply chain attack), a compromised security tool.
