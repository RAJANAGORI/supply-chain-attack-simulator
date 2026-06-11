# Supply Chain Attack Simulator — Documentation

**Single source of truth** for learners, blue-team practitioners, and instructors.

All Markdown in this folder is canonical. The [`docs/`](../docs/) directory publishes a GitHub Pages site (`index.html`, **[guide.html](../docs/guide.html)**) and **symlinks** to this tree — edit here, not in `docs/`, for content changes.

**Navigation hub:** [index.md](./index.md) — full file map with links to every section.

**Web documentation hub:** [guide.html](../docs/guide.html) — renders this folder sequentially in the browser (Zero to Hero 01→22, setup, detection, FAQ).

**Copyright:** Documentation © 2024–2026 **Raja Nagori**, licensed under [CC BY-NC-ND 4.0](../LICENSE-DOCUMENTATION.md). See [COPYRIGHT.md](../COPYRIGHT.md) and [ATTRIBUTION.md](../ATTRIBUTION.md). Software is [MIT](../LICENSE).

---

## Quick links

| Section | Index |
|---------|-------|
| Getting started | [getting-started/index.md](./getting-started/index.md) |
| Platform & operations | [platform/index.md](./platform/index.md) |
| Reference | [reference/index.md](./reference/index.md) |
| Scenario guides | [scenario-guides/index.md](./scenario-guides/index.md) |
| Learning path | [learning-path/index.md](./learning-path/index.md) |
| Teaching modules | [modules/index.md](./modules/index.md) |

---

## Choose your path

| You are… | Start here |
|----------|------------|
| **Brand-new to SCAS** | [ZERO_TO_HERO.md](./getting-started/ZERO_TO_HERO.md) → [Scenario 01 walkthrough](./scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_01.md) |
| **Experienced developer** | [QUICK_START.md](./getting-started/QUICK_START.md) → [Scenario catalog](./scenario-guides/CATALOG.md) |
| **Blue-team / detection focus** | [DETECTION_AND_OBSERVABILITY.md](./platform/DETECTION_AND_OBSERVABILITY.md) → `scenarios/*/DETECT.md` |
| **Instructor / workshop lead** | [TEACHING_DELIVERY_PACK.md](./learning-path/TEACHING_DELIVERY_PACK.md) → [Module instances](./modules/MODULE_INSTANCES_INDEX.md) |
| **Workshop with Elasticsearch** | [observability/README.md](../observability/README.md) → [OPERATIONS.md](./platform/OPERATIONS.md) |
| **Need one-page commands** | [QUICK_REFERENCE.md](./platform/QUICK_REFERENCE.md) |

Interactive onboarding: run [`START_HERE.sh`](../START_HERE.sh) from the repo root.

---

## Safety reminder

This test bench contains **intentionally vulnerable code** for education only.

- Use **only** in isolated environments (VM recommended)
- Always set `export TESTBENCH_MODE=enabled` before labs
- Never publish malicious samples to public registries
- Exfiltration targets **localhost only**

See [FAQ.md](./platform/FAQ.md) and [SECURITY.md](../SECURITY.md).

---

## Document maintenance

When changing scenario runtime behavior, update in lockstep:

1. `scenarios/NN-*/README.md` and `DETECT.md`
2. `documentation/scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_NN.md`
3. `documentation/scenario-guides/quick-reference/QUICK_REFERENCE_SCENARIO_NN.md`
4. `detection-tools/es/scenario-diagram-steps.js` (if observability flow changes)
5. Re-run `node detection-tools/es/generate-observability-section.js`
6. Re-run `node detection-tools/es/load-runbooks.js` if DETECT.md structure changes

---

**Questions?** See [FAQ.md](./platform/FAQ.md) or [open an issue](https://github.com/RAJANAGORI/supply-chain-attack-simulator/issues).
