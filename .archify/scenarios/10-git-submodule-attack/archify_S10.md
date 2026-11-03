# Scenario 10 architecture brief: Git Submodule Attack

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/10-git-submodule-attack`  
Control Center: `http://192.168.1.16:3100/scenarios/10`  
Guide: [Zero-to-Hero Scenario 10](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_10.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc10-git-submodule-attack-architecture.html`](architecture/sc10-git-submodule-attack-architecture.html) | Control Center, build-repos.sh, awesome-project parent repo, .gitmodules config, malicious-submodule, mock C2, capture file, submodule-validator.js |
| Attack sequence | [`sequence/sc10-git-submodule-attack-sequence.html`](sequence/sc10-git-submodule-attack-sequence.html) | Clone with --recurse-submodules → npm install → postinstall.sh exfil → app runs |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Automated checks passed; not visually reviewed.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Git submodule attacks spread damage because `git clone --recurse-submodules` fetches submodules automatically, npm install triggers submodule postinstall hooks, and victims never directly inspect submodule URLs.

---

## Why this lab exists

Real campaigns show attackers compromising git submodules referenced by trusted repositories. Victim clones the parent repo with `--recurse-submodules`, git automatically fetches the malicious submodule, and npm install triggers the submodule's postinstall hook. Scenario 10 copies that chain on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Victim clones parent repo | `git clone --recurse-submodules work/awesome-project` |
| Parent repo references compromised submodule | .gitmodules points to malicious-submodule |
| git fetches submodule automatically | `git submodule update --init` runs |
| npm install triggers submodule hook | malicious-submodule postinstall.sh fires |
| Secrets sent to attacker | `POST http://127.0.0.1:3000/collect` |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 10 with port `3000`, one service, install/run steps (combined into run-attack.sh), and one capture URL.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh`, creates mock-server.js, runs infrastructure/build-repos.sh to create local git repositories for awesome-project and malicious-submodule.

3. **build-repos.sh**  
   Creates real local git repositories using `git init`, sets up .gitmodules to reference malicious-submodule, commits both repos. Uses `protocol.file.allow=always` for local file: URLs.

4. **awesome-project**  
   Parent git repository. Contains .gitmodules that references malicious-submodule. Victim clones this repo.

5. **.gitmodules**  
   Git submodule configuration file. Points to malicious-submodule repository path.

6. **malicious-submodule**  
   Git submodule repository. Contains postinstall.sh that exfiltrates system info to `:3000/collect` when TESTBENCH_MODE is enabled.

7. **Mock C2 server**  
   - `mock-server.js` → `captured-data.json`  
   - Validates POST /collect payload and logs captures  
   - Optional Elasticsearch forwarding via `SCAS_ES_URL`

8. **submodule-validator.js**  
   Detection tool that scans .gitmodules for unexpected submodule URLs and validates submodule integrity.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps all components (awesome-project, gitmodules, malicious-submodule, mock C2, capture file).  
- Security group **TESTBENCH_MODE=enabled** wraps only the malicious-submodule node. Outside that gate, postinstall returns immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` creates mock server, runs build-repos.sh to create real local git repositories with submodule configuration.

### Chain 2 - Start listener (step 2)

Mock C2 must show Running on `:3000`. If down, exfil fails quietly and Inspector stays empty.

### Chain 3 - Clone and install (combined step, the attack)

```bash
cd victim-app
git -c protocol.file.allow=always clone --recurse-submodules \
    work/awesome-project work/victim-clone
export TESTBENCH_MODE=enabled
npm --prefix work/victim-clone install
```

git fetches the malicious submodule automatically. npm install triggers the submodule's postinstall.sh. That is the real-world git submodule attack pattern.

#### Phase A - git clones with submodules

1. `git clone --recurse-submodules` clones awesome-project.  
2. git reads .gitmodules and discovers malicious-submodule reference.  
3. `git submodule update --init` fetches malicious-submodule automatically.

#### Phase B - npm triggers submodule postinstall

1. `npm install` runs in the cloned repo.  
2. npm discovers malicious-submodule has postinstall.sh in its package.json.  
3. npm runs malicious-submodule/postinstall.sh.

#### Phase C - Postinstall exfil

1. postinstall.sh runs when npm install completes.  
2. Reads hostname, username, platform from environment.  
3. `POST` to `:3000/collect` with payload.

#### Phase D - Cover story

`node index.js` still works. Victim sees functioning app. No runtime errors. Damage is in captured-data.json.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Captured data | `GET :3000/captured-data` | One `git-submodule` capture with hostname and username |

Control Center Inspector panel maps to that URL.

Handy curls:

```bash
curl -s http://127.0.0.1:3000/captured-data
node detection-tools/submodule-validator.js work/victim-clone
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (port, service, captures) | `apps/control-plane/src/registry/scenarios.ts` | 163-177 |
| Repo creation | `scenarios/10-git-submodule-attack/infrastructure/build-repos.sh` | 1-80 |
| Gitmodules setup | `scenarios/10-git-submodule-attack/infrastructure/build-repos.sh` | 40-60 |
| Victim entry | `scenarios/10-git-submodule-attack/victim-app/index.js` | 1-22 |
| Postinstall hook | `scenarios/10-git-submodule-attack/malicious-submodule/postinstall.sh` | 1-43 |
| POST /collect | `scenarios/10-git-submodule-attack/infrastructure/mock-server.js` | 40-55 |
| Append captures | `scenarios/10-git-submodule-attack/infrastructure/mock-server.js` | 54-59 |
| Detection tool | `scenarios/10-git-submodule-attack/setup.sh` | 104-106 |
| Detection IOCs | `scenarios/10-git-submodule-attack/DETECT.md` | full runbook |

---

## Blue team / containment talk track

Hunt the correlated shape, not a repo name:

- One git clone with `--recurse-submodules`  
- Submodule fetched from unexpected URL  
- npm install runs postinstall in submodule  
- Reads system environment (hostname, username, platform)  
- Then one outbound POST  

Lab helpers: `detection-tools/submodule-validator.js` scans .gitmodules. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script:

1. Review .gitmodules for unexpected submodule URLs.  
2. `git submodule deinit -f <submodule-path>` to remove malicious submodule.  
3. Check captured-data.json for exfil timestamps.  
4. Audit submodule update history for tampering.

Control that breaks the loop: submodule URL validation in CI. Pin submodule commits with exact SHA. Review .gitmodules changes. Postinstall script execution and network POST are the IOCs.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/10-git-submodule-attack/architecture/candidate.json \
  .archify/scenarios/10-git-submodule-attack/architecture/sc10-git-submodule-attack-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/10-git-submodule-attack/sequence/candidate.json \
  .archify/scenarios/10-git-submodule-attack/sequence/sc10-git-submodule-attack-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this git submodule story is 11 (registry-mirror-poisoning), a different bug class.
