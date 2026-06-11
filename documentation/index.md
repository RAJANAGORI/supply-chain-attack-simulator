# Supply Chain Attack Simulator — Documentation index

**Single source of truth** for learners, blue-team practitioners, and instructors.

Canonical Markdown lives in **`documentation/`**. The [`docs/`](../docs/) directory publishes GitHub Pages (`index.html`, [guide.html](../docs/guide.html)) and **symlinks** to this tree — edit here, not in `docs/`, for content changes.

---

## Choose your path

| You are… | Start here |
|----------|------------|
| **Brand-new to SCAS** | [ZERO_TO_HERO.md](./getting-started/ZERO_TO_HERO.md) → [Scenario 01](./scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_01.md) |
| **Experienced developer** | [QUICK_START.md](./getting-started/QUICK_START.md) → [Scenario catalog](./scenario-guides/CATALOG.md) |
| **Blue-team / detection focus** | [DETECTION_AND_OBSERVABILITY.md](./platform/DETECTION_AND_OBSERVABILITY.md) → `scenarios/*/DETECT.md` |
| **Instructor / workshop lead** | [TEACHING_DELIVERY_PACK.md](./learning-path/TEACHING_DELIVERY_PACK.md) → [Module instances](./modules/MODULE_INSTANCES_INDEX.md) |
| **Workshop with Elasticsearch** | [observability/README.md](../observability/README.md) → [OPERATIONS.md](./platform/OPERATIONS.md) |
| **Need one-page commands** | [QUICK_REFERENCE.md](./platform/QUICK_REFERENCE.md) |

Interactive onboarding: [`START_HERE.sh`](../START_HERE.sh) from the repo root.

---

## Documentation sections

| Section | Index | Contents |
|---------|-------|----------|
| Getting started | [getting-started/index.md](./getting-started/index.md) | First lab, quick start, full setup |
| Platform & operations | [platform/index.md](./platform/index.md) | Architecture, operations, detection, FAQ |
| Reference | [reference/index.md](./reference/index.md) | Scenario summaries, external resources, roadmap |
| Scenario guides | [scenario-guides/index.md](./scenario-guides/index.md) | Catalog, zero-to-hero, quick-reference |
| Learning path | [learning-path/index.md](./learning-path/index.md) | Curriculum and teaching delivery |
| Teaching modules | [modules/index.md](./modules/index.md) | Instructor cards for all 22 scenarios |

---

## Folder map

```text
documentation/
├── README.md                 Project overview (you may also use this index)
├── index.md                  ← YOU ARE HERE (navigation hub)
├── getting-started/          Onboarding (3 guides)
├── platform/                 Architecture, ops, detection, FAQ (6 guides)
├── reference/                Catalogs & external refs (3 guides)
├── learning-path/            Curriculum (4 guides)
├── modules/                  Teaching cards (24 files)
└── scenario-guides/
    ├── CATALOG.md            All 22 scenarios — full link matrix
    ├── zero-to-hero/         22 learner walkthroughs
    └── quick-reference/      22 command cheat sheets
```

---

## Safety reminder

Use SCAS **only** in isolated environments. Always `export TESTBENCH_MODE=enabled`. Exfiltration targets **localhost only**.

See [FAQ.md](./platform/FAQ.md) and [SECURITY.md](../SECURITY.md).
