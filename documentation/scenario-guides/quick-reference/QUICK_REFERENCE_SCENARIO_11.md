# Quick Reference — Scenario 11: Registry Mirror Poisoning

> Run `./setup.sh` first — it generates `corporate-app/`, `compromised-mirror/`, and infrastructure.



## Table of Contents

<div class="doc-toc">

- [Setup](#setup)
- [Attack flow](#attack-flow)
- [Detection](#detection)
- [Docs](#docs)

</div>

---
## Setup

```bash
cd scenarios/11-registry-mirror-poisoning
export TESTBENCH_MODE=enabled
./setup.sh
```

## Attack flow

```bash
# Terminal A
node infrastructure/mock-server.js

# Terminal B
diff -r legitimate-packages/ compromised-mirror/
cd corporate-app
export TESTBENCH_MODE=enabled
npm install
cd ..
node detection-tools/mirror-validator.js
cd corporate-app
npm start
curl -s http://localhost:3000/captured-data
```

## Detection

```bash
node detection-tools/mirror-validator.js
cat scenarios/11-registry-mirror-poisoning/DETECT.md
```

## Docs

- [Zero-to-Hero walkthrough](../zero-to-hero/ZERO_TO_HERO_SCENARIO_11.md)
- [Scenario README](../../../scenarios/11-registry-mirror-poisoning/README.md)
- [Module card](../../modules/MODULE_INSTANCE_SCENARIO_11.md)
