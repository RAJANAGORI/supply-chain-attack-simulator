# Scenario 11 architecture brief: Registry Mirror Poisoning

Pinned revision: `71a87109b510ca824ad5077975365ea4659c6597`  
Lab slug: `scenarios/11-registry-mirror-poisoning`  
Control Center: `http://192.168.1.16:3100/scenarios/11`  
Guide: [Zero-to-Hero Scenario 11](https://simulator.rajanagori.in/guide.html?p=scenario-guides%2Fzero-to-hero%2FZERO_TO_HERO_SCENARIO_11.md)

## Interactive diagrams (Archify)

| View | File | What it shows |
|---|---|---|
| Lab topology | [`architecture/sc11-registry-mirror-poisoning-architecture.html`](architecture/sc11-registry-mirror-poisoning-architecture.html) | Control Center, corporate-app, poisoned registry :4873, mock collector :3000, two compromised packages, optional Floci |
| Attack sequence | [`sequence/sc11-registry-mirror-poisoning-sequence.html`](sequence/sc11-registry-mirror-poisoning-sequence.html) | Install → query mirror → fetch poisoned tarballs → postinstall lifecycle x2 → beacon x2 |

Open the HTML in a browser. Dark/light theme and source links are built in. Both diagrams were re-finalized with Archify **3.2.0** (showcase validate, deliver, check, browser-check). Perceptual screenshot review was not requested. 3.2.0 receipts live under each folder's `review-3.2.0/`.

Candidates live next to each HTML as `candidate.json` if you need to re-render.

---

## Verdict in one line

Corporate mirror poisoning works because the .npmrc redirect looks like normal internal policy, but the mirror serves compromised tarballs that npm installs without upstream hash verification.

This is not typosquatting. It is a supply chain hijack at the mirror layer.

---

## Why this lab exists

Public 2025 research (see `documentation/reference/RESOURCES.md`) describes corporate registries or mirrors that proxy npmjs.com but fail to verify tarball integrity. An attacker with mirror write access or MITM capability substitutes poisoned tarballs. Scenario 11 runs that on localhost:

| Real campaign claim | Lab stand-in |
|---|---|
| Corporate mirror serves compromised packages | registry-server.js :4873 with pre-built poisoned tarballs |
| .npmrc points to internal mirror | corporate-app/.npmrc → `registry=http://localhost:4873` |
| Malicious postinstall exfiltrates data | POST http://127.0.0.1:3000/collect |
| Mirror responds to npm protocol | GET /<pkg> metadata, GET /-/<tarball>.tgz |

Safety never leaves the box: `TESTBENCH_MODE === 'enabled'` gates the malicious path, and every beacon stays on `127.0.0.1`.

---

## System map (what the architecture diagram encodes)

### Actors and runtime units

1. **Control Center** (`apps/control-plane`, UI `:3100`, API `:3101`)  
   Registers scenario 11 with ports `[3000, 4873]`, two services, install/run steps, and one capture URL. Purple / Red / Blue lesson tracks drive the same shell the README uses.

2. **setup.sh**  
   Sources `scenarios/_shared/enable-testbench.sh` and runs `node infrastructure/build-registry.js` to pack legitimate packages and poisoned versions into `work/tarballs/`, then generates `work/registry-meta.json` with npm-compatible metadata.

3. **corporate-app**  
   Victim application whose `.npmrc` points to `:4873`. Depends on `secure-lib` and `enterprise-utils`. `npm install` fetches from the poisoned mirror. The app still loads normally after compromise - that quiet success is the cover.

4. **registry-server.js**  
   Speaks npm registry protocol on `:4873`. Serves GET `/<pkg>` metadata JSON and GET `/<pkg>/-/<pkg>-<ver>.tgz` tarballs from `work/`. Does not verify upstream hashes. Returns 404 for packages not in the poisoned set.

5. **Compromised packages**  
   `secure-lib` and `enterprise-utils` both include postinstall.js that gates on `TESTBENCH_MODE` and beacons to `:3000/collect` with package name, version, attackType, source, and timestamp.

6. **mock-server.js**  
   Collector on `:3000` that appends POST `/collect` payloads to `captured-data.json`. Exposes GET `/captured-data` for evidence retrieval.

7. **Optional Floci**  
   When Floci helpers load, postinstall beacons dual-write to `s3://scas-sc11-artifacts/`.

### Trust boundaries on the diagram

- Region **127.0.0.1 lab only** wraps corporate-app, poisoned mirror, packages, mock collector, and capture files.  
- Security group **TESTBENCH_MODE=enabled** wraps only the poisoned packages. Outside that gate, postinstall returns immediately.

---

## Attack chain (what the sequence diagram encodes)

### Chain 1 - Setup (Control Center step 1)

`./setup.sh` builds the poisoned mirror tarball store and metadata before any install. The registry-server needs `work/registry-meta.json` to respond to npm queries.

### Chain 2 - Start listeners (step 2)

Both services must show Running:
- `:4873` registry-server.js (poisoned mirror)
- `:3000` mock-server.js (collector)

If `:4873` is down, npm falls back to npmjs.com and pulls clean packages. If `:3000` is down, beacons fail quietly and the Inspector stays empty.

### Chain 3 - Install (the attack)

```bash
cd corporate-app
export TESTBENCH_MODE=enabled
npm install
```

npm respects `.npmrc` and queries `:4873` instead of npmjs.com. That is the real-world internal mirror pattern.

#### Phase A - Metadata query

1. `GET /secure-lib` on `:4873`.  
2. Registry returns poisoned metadata JSON with tarball URL pointing back to `:4873`.

#### Phase B - Tarball fetch

1. `GET /secure-lib/-/secure-lib-2.0.0.tgz` on `:4873`.  
2. Registry serves pre-built tarball with malicious postinstall.js.  
3. Same for `enterprise-utils`.

npm does not compare tarball SHA against npmjs.com. The poisoned mirror is trusted.

#### Phase C - Lifecycle execution

npm unpacks tarballs and runs postinstall hooks before the app starts. Both `secure-lib` and `enterprise-utils` check `TESTBENCH_MODE`, then POST to `:3000/collect`.

#### Phase D - Cover story

`npm start` still works. `corporate-app/index.js` loads both packages normally. No postinstall remains in `node_modules/*/package.json` after install completes. Working tree looks fine. Damage is in the collector history.

---

## Evidence you show on stage

| Capture | Endpoint | Pass criteria |
|---|---|---|
| Exfiltrated beacons | `GET :3000/captured-data` | Two rows: secure-lib and enterprise-utils with attackType "registry-mirror-poisoning" |

Control Center Inspector panel maps to that URL (see `captures` in `apps/control-plane/src/registry/scenarios.ts`).

Handy curls:

```bash
curl -s http://127.0.0.1:3000/captured-data
node detection-tools/mirror-validator.js work/registry-meta.json
```

---

## Source anchors (repo-backed)

| Claim | Path | Lines (approx) |
|---|---|---|
| Scenario registry (ports, services, captures) | `apps/control-plane/src/registry/scenarios.ts` | 179-189 |
| Registry server npm protocol | `scenarios/11-registry-mirror-poisoning/infrastructure/registry-server.js` | 39-80 |
| Build poisoned tarballs | `scenarios/11-registry-mirror-poisoning/infrastructure/build-registry.js` | 1-50 |
| Postinstall beacon (secure-lib) | `scenarios/11-registry-mirror-poisoning/compromised-mirror/secure-lib/postinstall.js` | 1-22 |
| Postinstall beacon (enterprise-utils) | `scenarios/11-registry-mirror-poisoning/compromised-mirror/enterprise-utils/postinstall.js` | 1-22 |
| Mock collector | `scenarios/11-registry-mirror-poisoning/infrastructure/mock-server.js` | 12-50 |
| Corporate .npmrc redirect | `scenarios/11-registry-mirror-poisoning/corporate-app/.npmrc` | 1 |
| Setup narrative | `scenarios/11-registry-mirror-poisoning/setup.sh` | 1-30 |
| Detection IOCs | `scenarios/11-registry-mirror-poisoning/DETECT.md` | full runbook |

Dirty worktree note when this brief was authored: only untracked `archify_S11.md` (plus Archify output under `.archify/`). Evidence citations are against committed bytes at the pinned revision above.

---

## Blue team / containment talk track

Hunt the integrity gap:

- Corporate mirror serves tarballs without upstream SHA512 verification  
- npm install trusts the mirror and skips public registry checks  
- Postinstall runs before the app starts  

Lab helpers: `detection-tools/mirror-validator.js` compares mirror metadata against npmjs.com hashes. Full Sigma / YARA sketches live in `DETECT.md`.

Containment script to say out loud:

1. Compare every tarball SHA512 served by the mirror against official npmjs.com records.  
2. Quarantine packages with mismatched hashes.  
3. Rebuild mirror from upstream tarballs with verified integrity.  
4. Monitor mirror access logs for unexpected metadata or tarball modifications.

Control that breaks the loop: corporate mirrors must fetch-and-verify tarballs against upstream hashes before serving them downstream. The mirror becomes a cache, not a trust boundary.

---

## How the surfaces fit together

| Surface | Job |
|---|---|
| Zero-to-Hero guide | Teacher script: why mirrors, npm protocol trust, integrity gap, containment lines |
| Control Center `/scenarios/11` | Cockpit: setup → 2 services → install → run → detect, live logs, one evidence drawer |
| Architecture HTML | Static topology for slides / deep links into source |
| Sequence HTML | Timed mirror substitution story for the room |
| This brief (`archify_S11.md`) | Single narrative that ties all of the above |

Same chain everywhere. Guide narrates it. UI executes it. Archify diagrams freeze the shape for reuse.

---

## Re-render

From repo root:

```bash
ARCHIFY=.agents/skills/archify/bin/archify.mjs

node "$ARCHIFY" finalize architecture \
  .archify/scenarios/11-registry-mirror-poisoning/architecture/candidate.json \
  .archify/scenarios/11-registry-mirror-poisoning/architecture/sc11-registry-mirror-poisoning-architecture.html \
  --repo-root . --quality showcase --json

node "$ARCHIFY" finalize sequence \
  .archify/scenarios/11-registry-mirror-poisoning/sequence/candidate.json \
  .archify/scenarios/11-registry-mirror-poisoning/sequence/sc11-registry-mirror-poisoning-sequence.html \
  --repo-root . --quality showcase --json
```

Next lab in the catalog after this mirror story is 12 (workspace monorepo attack), a different trust boundary.
