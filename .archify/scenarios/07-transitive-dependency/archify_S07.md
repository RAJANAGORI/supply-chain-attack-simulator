# Scenario 07 architecture brief: Transitive Dependency

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/07-transitive-dependency`  
Control Center: `http://192.168.1.16:3100/scenarios/07`  
Guide: [Zero-to-Hero Scenario 07](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_07.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc07-transitive-dependency-architecture.html`](architecture/sc07-transitive-dependency-architecture.html) | Control Center, victim app, web-utils, compromised data-processor, mock C2, capture file |
| Attack sequence | [`sequence/sc07-transitive-dependency-sequence.html`](sequence/sc07-transitive-dependency-sequence.html) | Install → npm pulls transitive → postinstall exfil → app runs |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Automated checks passed; not visually reviewed.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Transitive dependencies spread damage because a victim never names them, npm pulls them in automatically, and their postinstall runs before the app starts.

---

## Why this lab exists

Real campaigns (event-stream → flatmap-stream 2018, multiple 2021 npm compromises) show attackers compromising a package that other packages depend on. Victim installs a trusted parent package; npm automatically installs the compromised transitive dependency. Scenario 07 copies that chain on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Victim installs trusted package | `npm install` in victim-app |
| Trusted package depends on compromised package | web-utils requires data-processor |
| npm pulls transitive dependency | npm installs data-processor automatically |
| Postinstall runs | data-processor postinstall.js fires |
| Secrets sent to attacker | `POST http://127.0.0.1:3000/collect` |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 07 with port `3000`, one service, install/swap/run steps, and one capture URL.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, creates mock-server.js, builds legitimate and compromised data-processor packages, and installs victim-app dependencies.

3. **victim-app**  
   Depends on `web-utils` (legitimate package). `web-utils` depends on `data-processor` (transitive). Victim never directly names data-processor in package.json. `npm start` still works after compromise.

4. **data-processor**  
   Compromised transitive dependency. Postinstall.js exfiltrates system info to `:3000/collect` when TESTBENCH_MODE is enabled.

5. **Mock C2 server**  
   - `mock-server.js` → `captured-data.json`  
   - Validates POST /collect payload and logs captures  
   - Optional Elasticsearch forwarding via `SCAS_ES_URL`

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps victim, web-utils, data-processor, mock C2, and capture file.  
- Security group **TESTBENCH_MODE=enabled** wraps only the data-processor node. Outside that gate, postinstall returns immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` creates mock server, builds legitimate packages, and installs victim-app dependencies. web-utils pulls in data-processor as a transitive dependency.

### Chain 2 - Start listener (step 2)

Mock C2 must show Running on `:3000`. If down, exfil fails quietly and Inspector stays empty.

### Chain 3 - Install (step 3, the attack)

```bash
cd victim-app
export TESTBENCH_MODE=enabled
npm install
```

npm runs data-processor postinstall before the app starts. That is the real-world transitive dependency pattern.

#### Phase A - npm resolves transitive

1. npm reads victim-app package.json and sees web-utils dependency.  
2. npm reads web-utils package.json and discovers data-processor dependency.  
3. npm installs data-processor automatically (victim never named it).

#### Phase B - Postinstall exfil

1. data-processor postinstall.js runs when npm install completes.  
2. Reads hostname, username, platform from environment.  
3. `POST` to `:3000/collect` with payload.

#### Phase C - Cover story

`npm start` still works. Victim sees functioning app. No runtime errors. Damage is in captured-data.json.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Captured data | `GET :3000/captured-data` | One `transitive-dependency` capture with hostname and username |

Control Center Inspector panel maps to that URL.

Handy curls:

```bash
curl -s http://127.0.0.1:3000/captured-data
node detection-tools/dependency-tree-scanner.js victim-app
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (port, service, captures) | `apps/control-plane/src/registry/scenarios.ts` | 144-154 |
| Mock server creation | `scenarios/07-transitive-dependency/setup.sh` | 31-123 |
| Victim entry | `scenarios/07-transitive-dependency/victim-app/index.js` | 1-20 |
| web-utils dependency | `scenarios/07-transitive-dependency/victim-app/package.json` | 1-12 |
| POST /collect | `scenarios/07-transitive-dependency/infrastructure/mock-server.js` | 51-69 |
| Append captures | `scenarios/07-transitive-dependency/infrastructure/mock-server.js` | 74-80 |
| Detection IOCs | `scenarios/07-transitive-dependency/DETECT.md` | full runbook |

---

## Blue team / containment talk track

Hunt the correlated shape, not a package-name string:

- One npm process  
- Installs a package the victim never directly named  
- Reads system environment (hostname, username, platform)  
- Then one outbound POST  

Lab helpers: `detection-tools/dependency-tree-scanner.js`. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script:

1. Review package-lock.json for unexpected transitive dependencies.  
2. `npm uninstall data-processor`, then `npm ci --ignore-scripts`.  
3. Audit all packages that depend on the compromised transitive.  
4. Check captured-data.json for exfil timestamps.

Control that breaks the loop: pin transitive dependencies in package-lock.json and review changes. Postinstall file reads and network POST are the IOCs.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/07-transitive-dependency/architecture/candidate.json \
  .archify/scenarios/07-transitive-dependency/architecture/sc07-transitive-dependency-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/07-transitive-dependency/sequence/candidate.json \
  .archify/scenarios/07-transitive-dependency/sequence/sc07-transitive-dependency-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this transitive story is 08 (package-lock-file-manipulation), a different bug class.
