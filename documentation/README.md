# Supply Chain Attack Simulator — Documentation

**Single source of truth** for learners, blue-team practitioners, and instructors.

All Markdown in this folder is canonical. The [`docs/`](../docs/) directory publishes a GitHub Pages site (`index.html`, **[guide.html](../docs/guide.html)**) and **symlinks** to this tree — edit here, not in `docs/`, for content changes.

**Web documentation hub:** [guide.html](../docs/guide.html) — renders this folder sequentially in the browser (Zero to Hero 01→22, setup, detection, FAQ).

**Copyright:** Documentation in this folder © 2024–2026 **Raja Nagori**, licensed under [CC BY-NC-ND 4.0](../LICENSE-DOCUMENTATION.md). See [COPYRIGHT.md](../COPYRIGHT.md) and [ATTRIBUTION.md](../ATTRIBUTION.md). Software in this repo is [MIT](../LICENSE).

---

## Choose your path

| You are… | Start here |
|----------|------------|
| **Brand-new to SCAS** | [ZERO_TO_HERO.md](./ZERO_TO_HERO.md) → [Scenario 01 walkthrough](./scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_01.md) |
| **Experienced developer** | [QUICK_START.md](./QUICK_START.md) → [Scenario catalog](./scenario-guides/CATALOG.md) |
| **Blue-team / detection focus** | [DETECTION_AND_OBSERVABILITY.md](./DETECTION_AND_OBSERVABILITY.md) → `scenarios/*/DETECT.md` |
| **Instructor / workshop lead** | [TEACHING_DELIVERY_PACK.md](./learning-path/TEACHING_DELIVERY_PACK.md) → [Module instances](./modules/MODULE_INSTANCES_INDEX.md) |
| **Workshop with Elasticsearch** | [observability/README.md](../observability/README.md) → [OPERATIONS.md](./OPERATIONS.md) |
| **Need one-page commands** | [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) |

Interactive onboarding: run [`START_HERE.sh`](../START_HERE.sh) from the repo root.

---

## Core documentation

| Document | Description |
|----------|-------------|
| [ZERO_TO_HERO.md](./ZERO_TO_HERO.md) | First lab walkthrough for beginners |
| [QUICK_START.md](./QUICK_START.md) | Fast setup and first scenario (experienced users) |
| [SETUP.md](./SETUP.md) | Complete installation and environment configuration |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Repo layout, mock-server contract, safety gates, data flow |
| [OPERATIONS.md](./OPERATIONS.md) | Scripts, ports, teardown, standard lab workflow |
| [DETECTION_AND_OBSERVABILITY.md](./DETECTION_AND_OBSERVABILITY.md) | DETECT.md runbooks, scanners, Elasticsearch + Kibana |
| [BEST_PRACTICES.md](./BEST_PRACTICES.md) | Defensive patterns and prevention |
| [FAQ.md](./FAQ.md) | Troubleshooting and common questions |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | One-page command and navigation hub |
| [SCENARIOS.md](./SCENARIOS.md) | Scenario summaries and skills |
| [RESOURCES.md](./RESOURCES.md) | External tools, incidents, and standards |
| [ROADMAP.md](./ROADMAP.md) | 2026 enhancement backlog |

---

## Scenario catalog (22 labs)

**Master table** with links to every runtime README, DETECT runbook, zero-to-hero guide, quick reference, and teaching module:

→ **[scenario-guides/CATALOG.md](./scenario-guides/CATALOG.md)**

### Scenario guides index

| Type | Index | Count |
|------|-------|-------|
| Zero-to-hero walkthroughs | [scenario-guides/zero-to-hero/](./scenario-guides/zero-to-hero/README.md) | 22 |
| Quick reference cards | [scenario-guides/quick-reference/](./scenario-guides/quick-reference/README.md) | 22 |
| Runtime lab instructions | [`scenarios/`](../scenarios/) | 22 READMEs |
| Blue-team runbooks | `scenarios/*/DETECT.md` | 22 |

---

## Learning path and curriculum

| Document | Description |
|----------|-------------|
| [SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md](./learning-path/SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md) | Curriculum landing — trust-edge model, staged progression |
| [SCENARIO_LEARNING_PATH.md](./learning-path/SCENARIO_LEARNING_PATH.md) | Beginner → intermediate → advanced tracks |
| [TEACHING_DELIVERY_PACK.md](./learning-path/TEACHING_DELIVERY_PACK.md) | Talk, workshop, course, and lab formats |
| [CAPSTONE_RUBRIC.md](./learning-path/CAPSTONE_RUBRIC.md) | Capstone deliverables and scoring |

---

## Teaching modules (instructors)

| Document | Description |
|----------|-------------|
| [MODULE_TEMPLATE.md](./modules/MODULE_TEMPLATE.md) | Reusable module schema |
| [MODULE_INSTANCES_INDEX.md](./modules/MODULE_INSTANCES_INDEX.md) | Index of all 22 module cards |
| [MODULE_INSTANCE_SCENARIO_01.md](./modules/MODULE_INSTANCE_SCENARIO_01.md) … [22](./modules/MODULE_INSTANCE_SCENARIO_22.md) | Per-scenario teaching cards |

---

## Platform and observability

| Document | Description |
|----------|-------------|
| [observability/README.md](../observability/README.md) | Docker Elasticsearch + Kibana stack |
| [detection-tools/package-scanner.js](../detection-tools/package-scanner.js) | Shared Node.js package scanner |
| [detection-tools/es/](../detection-tools/es/) | Elasticsearch shippers and Kibana setup |
| [scripts/ports.env](../scripts/ports.env) | Port allow-list (source of truth) |

Key scripts: [`setup.sh`](../scripts/setup.sh) · [`teardown.sh`](../scripts/teardown.sh) · [`elasticsearch-up.sh`](../scripts/elasticsearch-up.sh) · [`setup-kibana-data-views.sh`](../scripts/setup-kibana-data-views.sh)

---

## Community and governance

| Document | Description |
|----------|-------------|
| [CONTRIBUTING.md](../CONTRIBUTING.md) | How to contribute |
| [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) | Community standards |
| [SECURITY.md](../SECURITY.md) | Security policy |
| [LICENSE](../LICENSE) | MIT License (software) |
| [LICENSE-DOCUMENTATION.md](../LICENSE-DOCUMENTATION.md) | CC BY-NC-ND 4.0 (documentation) |
| [COPYRIGHT.md](../COPYRIGHT.md) | Copyright and ownership |
| [ATTRIBUTION.md](../ATTRIBUTION.md) | How to credit this project |
| [AUTHORS.md](../AUTHORS.md) | Creator and contributors |

---

## Complete file map

```text
documentation/
├── README.md                          ← YOU ARE HERE (master index)
├── ZERO_TO_HERO.md                    First lab for beginners
├── QUICK_START.md · SETUP.md          Setup paths
├── ARCHITECTURE.md                    Platform design
├── OPERATIONS.md                      Scripts & ports
├── DETECTION_AND_OBSERVABILITY.md     Blue team + ES/Kibana
├── BEST_PRACTICES.md · FAQ.md         Defense & troubleshooting
├── QUICK_REFERENCE.md · SCENARIOS.md  Navigation & summaries
├── RESOURCES.md · ROADMAP.md          External refs & backlog
├── learning-path/                     Curriculum (4 files)
├── modules/                           Teaching cards (24 files)
└── scenario-guides/
    ├── CATALOG.md                     All 22 scenarios — full link matrix
    ├── zero-to-hero/                  22 learner walkthroughs + README
    └── quick-reference/               22 command cheat sheets + README
```

---

## Safety reminder

This test bench contains **intentionally vulnerable code** for education only.

- Use **only** in isolated environments (VM recommended)
- Always set `export TESTBENCH_MODE=enabled` before labs
- Never publish malicious samples to public registries
- Exfiltration targets **localhost only**

See [FAQ.md](./FAQ.md) and [SECURITY.md](../SECURITY.md).

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

**Questions?** See [FAQ.md](./FAQ.md) or [open an issue](https://github.com/RAJANAGORI/supply-chain-attack-simulator/issues).
