# Scenario 18 architecture brief: Package manager plugin attack

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/18-package-manager-plugin-attack`  
Control Center: `http://192.168.1.16:3100/scenarios/18`  
Guide: [Zero-to-Hero Scenario 18](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_18.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc18-package-manager-plugin-attack-architecture.html`](architecture/sc18-package-manager-plugin-attack-architecture.html) | Control Center, victim workspace, pnpmfile hook, target-lib, malicious-logger, mock C2, capture file |
| Attack sequence | [`sequence/sc18-package-manager-plugin-attack-sequence.html`](sequence/sc18-package-manager-plugin-attack-sequence.html) | pnpm install → hook fires → inject malicious-logger → require target-lib → beacon |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder's `review-3.2.0/`.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Package manager plugin attacks use pnpm's `.pnpmfile.cjs` hook to silently inject malicious dependencies during install without touching `package.json`, making detection and attribution harder.

This is not "one bad package." It is hook-based injection. The hook adds dependencies the lockfile never named.

---

## Why this lab exists

Public 2024-2025 writeups (pnpm hook attacks in StepSecurity notes, `documentation/reference/RESOURCES.md`) describe install-time hooks that modify package dependencies during resolution: a malicious `.pnpmfile.cjs` adds a compromised package to another package's dependencies without touching `package.json`. Scenario 18 copies that pattern on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Malicious `.pnpmfile.cjs` hook | `victim-app/.pnpmfile.cjs` |
| Hook fires during install | pnpm's `readPackage` hook |
| Hook injects malicious dependency | Adds `malicious-logger` to `target-lib` |
| Injected package beacons | `POST http://127.0.0.1:3018/collect` |

Safety never leaves the box: hook and malware gate on `TESTBENCH_MODE === 'enabled'` and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 18 with port `3018`, one service, install/run steps, and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, creates the malicious `.pnpmfile.cjs` hook, and builds `victim-app` workspace.

3. **victim-app**  
   Workspace that depends on `target-lib`. `pnpm install` fires the hook. `npm start` still greets normally after compromise.

4. **.pnpmfile.cjs**  
   The hook. pnpm automatically loads this file during install and calls `readPackage` for each dependency. Hook adds `malicious-logger` to `target-lib` dependencies without touching `package.json`.

5. **target-lib**  
   A clean package. Because the hook injected `malicious-logger`, `target-lib` transitively requires it on load.

6. **malicious-logger**  
   The malware. Config hard-codes C2 `:3018/collect`. Beacon fires on module load when `TESTBENCH_MODE=enabled`.

7. **Mock C2 server**  
   `infrastructure/mock-server.js` → `captured-data.json`  
   Expects one beacon from `malicious-logger`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps victim, hook, target-lib, malware, mock C2, and capture file.  
- Security group **TESTBENCH_MODE=enabled** wraps hook and malware nodes. Outside that gate, no injection or beacon fires.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` creates the malicious `.pnpmfile.cjs` hook and victim workspace before anything "malicious" runs.

### Chain 2 - Start listener (step 2)

Mock C2 must show Running. If `:3018` is down, beacons fail quietly and the Inspector stays empty.

### Chain 3 - Install (the attack)

```bash
cd victim-app
export TESTBENCH_MODE=enabled
npx pnpm@9.15.9 install
npm start
```

pnpm install fires `.pnpmfile.cjs` `readPackage(target-lib)`, hook adds `malicious-logger`, pnpm installs it, `target-lib` requires it, beacon fires.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Hook injection beacon | `GET :3018/captured-data` | One beacon proving `malicious-logger` executed |

Control Center Inspector panel maps 1:1 to that URL (see `captures` in `apps/control-plane/src/registry/scenarios.ts`).

Handy curls:

```bash
curl -s http://127.0.0.1:3018/captured-data
node detection-tools/plugin-attack-detector.js victim-app
```

---

## Blue team / containment talk track

Hunt the correlated shape, not a package-name string:

- pnpm install  
- `.pnpmfile.cjs` exists  
- Installed dependency not in `package.json` or lockfile  
- Beacon from injected package  

Lab helpers: `detection-tools/plugin-attack-detector.js`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. Remove `.pnpmfile.cjs`; switch to `npm ci --ignore-scripts`.  
2. Monitor package manager plugin activity during install.  
3. Audit `.pnpmfile.cjs`, `.npmrc`, or other lifecycle hooks for unexpected dependency additions.

Control that breaks the hook: audit `.pnpmfile.cjs` or use npm (not pnpm). The hook can still exist. npm never loads it. Attack dies at install.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/18-package-manager-plugin-attack/architecture/candidate.json \
  .archify/scenarios/18-package-manager-plugin-attack/architecture/sc18-package-manager-plugin-attack-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/18-package-manager-plugin-attack/sequence/candidate.json \
  .archify/scenarios/18-package-manager-plugin-attack/sequence/sc18-package-manager-plugin-attack-sequence.html \
  --repo-root . --quality showcase --json
```
