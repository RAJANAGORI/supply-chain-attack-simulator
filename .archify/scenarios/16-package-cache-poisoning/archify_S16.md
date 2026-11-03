# Scenario 16 architecture brief: Package cache poisoning

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/16-package-cache-poisoning`  
Control Center: `http://192.168.1.16:3100/scenarios/16`  
Guide: [Zero-to-Hero Scenario 16](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_16.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc16-package-cache-poisoning-architecture.html`](architecture/sc16-package-cache-poisoning-architecture.html) | Control Center, victim workspace, poisoned cache, malware, mock C2, capture file |
| Attack sequence | [`sequence/sc16-package-cache-poisoning-sequence.html`](sequence/sc16-package-cache-poisoning-sequence.html) | Install1 → poison cache → install2 → reuse poisoned cache → beacon x2 |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder's `review-3.2.0/`.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Package cache poisoning turns npm's performance optimization into a persistence mechanism: first install poisons `~/.npm/_cacache`, second install reuses the cached malware even after `rm -rf node_modules`.

This is not "one bad install." It is cache persistence. `npm install` twice proves it.

---

## Why this lab exists

Public 2024-2025 writeups (npm cache attacks in StepSecurity notes, `documentation/reference/RESOURCES.md`) describe install-time scripts that poison the npm cache so that later installs of the same package load compromised code even from a clean registry. Scenario 16 copies that loop on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Malicious package poisons npm cache | `scenarios/16-package-cache-poisoning/cache/cache-lib/` |
| First install writes poisoned package to cache | `victim-app/scripts/install-from-cache.js` |
| Second install reuses poisoned cache | Same script, second run |
| Beacon from cached malware | `POST http://127.0.0.1:3016/collect` |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 16 with port `3016`, one service, install1/install2/run steps, and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, creates the poisoned `cache/cache-lib/` package, and builds `victim-app` workspace.

3. **victim-app**  
   Workspace that depends on `cache-lib`. First install runs `scripts/install-from-cache.js` to copy poisoned package into `node_modules`. Second install reuses the cached version. `npm start` still greets normally after compromise.

4. **cache-lib poisoned**  
   The malware. Config hard-codes C2 `:3016/collect`. Beacon fires on module load when `TESTBENCH_MODE=enabled`.

5. **Mock C2 server**  
   `infrastructure/mock-server.js` → `captured-data.json`  
   Expects two beacons: one from install1, one from install2 proving cache persistence.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps victim, cache, malware, mock C2, and capture file.  
- Security group **TESTBENCH_MODE=enabled** wraps only the malware node. Outside that gate, no beacon fires.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` creates the poisoned `cache/cache-lib/` package and victim workspace before anything "malicious" runs.

### Chain 2 - Start listener (step 2)

Mock C2 must show Running. If `:3016` is down, beacons fail quietly and the Inspector stays empty. Same lesson as production: you only see what arrived.

### Chain 3 - Install1 (first attack)

```bash
cd victim-app
export TESTBENCH_MODE=enabled
npm install
```

`scripts/install-from-cache.js` copies poisoned `cache/cache-lib/` into `node_modules/cache-lib`. First `require('cache-lib')` fires the beacon.

### Chain 4 - Install2 (cache persistence)

```bash
rm -rf node_modules package-lock.json
npm install
```

Same script copies the cached package again. Second `require('cache-lib')` fires the second beacon, proving the cache persisted malware across installs.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Two beacons | `GET :3016/captured-data` | Two `cache-lib-load` rows with different timestamps |

Control Center Inspector panel maps 1:1 to that URL (see `captures` in `apps/control-plane/src/registry/scenarios.ts`).

Handy curls:

```bash
curl -s http://127.0.0.1:3016/captured-data
node detection-tools/cache-poisoning-detector.js victim-app
```

---

## Blue team / containment talk track

Hunt the correlated shape, not a package-name string:

- One npm process  
- Installs package  
- Beacons on module load  
- Second install after `rm -rf node_modules` beacons again  

Lab helpers: `detection-tools/cache-poisoning-detector.js`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. `npm cache clean --force` between installs stops reinfection.  
2. `npm ci --ignore-scripts` skips lifecycle hooks but still uses cache.  
3. Cache integrity checks or hash verification on extraction.

Control that breaks the loop: cache integrity validation. The `npm install` can still run. The cache cannot reuse poisoned bytes. Attack dies at install two.

---

## How the surfaces fit together

| Surface | Job |
|---|---|
| Zero-to-Hero guide | Teacher script: why cache poisoning, two-install proof, containment lines |
| Control Center `/scenarios/16` | Cockpit: setup → service → install1 → install2 → run → detect, live logs, one evidence drawer |
| Architecture HTML | Static topology for slides / deep links into source |
| Sequence HTML | Timed install-time story for the room |
| This brief (`archify_S16.md`) | Single narrative that ties all of the above |

Same chain everywhere. Guide narrates it. UI executes it. Archify diagrams freeze the shape for reuse.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/16-package-cache-poisoning/architecture/candidate.json \
  .archify/scenarios/16-package-cache-poisoning/architecture/sc16-package-cache-poisoning-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/16-package-cache-poisoning/sequence/candidate.json \
  .archify/scenarios/16-package-cache-poisoning/sequence/sc16-package-cache-poisoning-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this cache persistence story is 17 (multi-stage attack chain), a different attack class.
