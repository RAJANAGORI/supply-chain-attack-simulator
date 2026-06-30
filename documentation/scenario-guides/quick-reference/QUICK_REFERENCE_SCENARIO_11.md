# Quick Reference — Scenario 11: Registry Mirror Poisoning

> Run `./setup.sh` first — it packs poisoned tarballs and writes `work/registry-meta.json`.





## Table of Contents

<div class="doc-toc">

- [Setup](#setup)
- [Attack flow](#attack-flow)
- [Detection](#detection)
- [Docs](#docs)
- [Troubleshooting](#troubleshooting)

</div>

---
## Setup

```bash
cd scenarios/11-registry-mirror-poisoning
export TESTBENCH_MODE=enabled
./setup.sh
```

## Attack flow

Three terminals:

```bash
# Terminal A — mock C2 (:3000)
node infrastructure/mock-server.js

# Terminal B — poisoned registry mirror (:4873)
node infrastructure/registry-server.js

# Terminal C — victim
diff -r legitimate-packages/ compromised-mirror/
cd corporate-app
rm -rf node_modules package-lock.json
export TESTBENCH_MODE=enabled
npm install                    # .npmrc → localhost:4873; postinstall fires on install
npm start
curl -s http://localhost:3000/captured-data
```

## Detection

```bash
node detection-tools/mirror-validator.js compromised-mirror legitimate-packages
cat scenarios/11-registry-mirror-poisoning/DETECT.md
grep -r postinstall corporate-app/node_modules/
```

## Docs

- [Zero-to-Hero walkthrough](../zero-to-hero/ZERO_TO_HERO_SCENARIO_11.md)
- [Scenario README](../../../scenarios/11-registry-mirror-poisoning/README.md)
- [Detection runbook](../../../scenarios/11-registry-mirror-poisoning/DETECT.md)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| npm can't reach registry | Start `node infrastructure/registry-server.js` on :4873 |
| No capture | `TESTBENCH_MODE=enabled` before `npm install`; mock server on :3000 |
| work/ missing | `node infrastructure/build-registry.js` |
