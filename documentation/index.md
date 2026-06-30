# Supply Chain Attack Simulator — Documentation

**The single source of truth** for learners, blue-team practitioners, and instructors.

Canonical Markdown lives in **`documentation/`**. The [`docs/`](../docs/) directory publishes the GitHub Pages site (`index.html` landing page, [`guide.html`](../docs/guide.html) reader) and **symlinks** back to this tree — always edit here, never in `docs/`.

**Browse on the web:** [Documentation hub (`guide.html`)](../docs/guide.html) renders this folder with sidebar navigation, search, and sequential paging.

---

## Start by role

| You are… | Start here | Then |
|----------|------------|------|
| **New to SCAS** | [Full-stack setup](./getting-started/FULL_STACK_SETUP.md) | [Scenario 01 walkthrough](./scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_01.md) |
| **Experienced developer** | [Quick start](./getting-started/QUICK_START.md) | [Scenario catalog](./scenario-guides/CATALOG.md) |
| **Blue-team / detection** | [Detection & observability](./platform/DETECTION_AND_OBSERVABILITY.md) | `scenarios/*/DETECT.md` (IOCs + mitigation) |
| **Instructor / workshop lead** | [Teaching delivery pack](./learning-path/TEACHING_DELIVERY_PACK.md) | [Teaching modules](./modules/index.md) |
| **Running the observability stack** | [Operations](./platform/OPERATIONS.md) | [Observability stack](../observability/README.md) |
| **Maintainer / contributor** | [Tooling & doc maintenance](./platform/TOOLING.md) | [CONTRIBUTING](../CONTRIBUTING.md) |

---

## Browse by task

- **Set up the lab** → [Full-stack setup](./getting-started/FULL_STACK_SETUP.md) · [SETUP](./getting-started/SETUP.md) · [Operations](./platform/OPERATIONS.md) · [FAQ](./platform/FAQ.md)
- **Run one scenario** → [Scenario catalog](./scenario-guides/CATALOG.md) → its README → [Quick-reference card](./scenario-guides/quick-reference/index.md)
- **Learn an attack class** → [Zero-to-hero walkthroughs](./scenario-guides/zero-to-hero/index.md)
- **Detect & hunt** → [Detection & observability](./platform/DETECTION_AND_OBSERVABILITY.md) · [Best practices](./platform/BEST_PRACTICES.md)
- **Teach a course** → [Learning path](./learning-path/index.md) · [Modules](./modules/index.md) · [Capstone rubric](./learning-path/CAPSTONE_RUBRIC.md)
- **Optional cloud track** → [Floci integration guide](./guides/FLOCI_INTEGRATION.md)
- **One-page commands** → [Quick reference](./platform/QUICK_REFERENCE.md)

---

## Documentation map

| Section | Index | What's inside |
|---------|-------|---------------|
| **Getting started** | [getting-started/](./getting-started/index.md) | Full-stack setup, first lab, quick start, SCAS-only setup |
| **Scenario guides** | [scenario-guides/](./scenario-guides/index.md) | The 22-lab [catalog](./scenario-guides/CATALOG.md), zero-to-hero walkthroughs, quick-reference cards |
| **Platform & operations** | [platform/](./platform/index.md) | Architecture, operations, detection, best practices, tooling, FAQ, quick reference |
| **Learning path** | [learning-path/](./learning-path/index.md) | Curriculum, tracks, teaching delivery, capstone rubric |
| **Teaching modules** | [modules/](./modules/index.md) | Instructor cards for all 23 scenarios + reusable template |
| **Integration guides** | [guides/](./guides/index.md) | Optional integrations (Floci local-AWS cloud track) |
| **Reference** | [reference/](./reference/index.md) | Scenario summaries and external resources |
| **Governance** | [LEGAL](../LEGAL.md) · [ATTRIBUTION](../ATTRIBUTION.md) · [AUTHORS](../AUTHORS.md) | Copyright, licensing, attribution |

---

## Folder map

```text
documentation/
├── index.md                  ← YOU ARE HERE (canonical navigation hub)
├── README.md                 Thin pointer for GitHub folder view → this index
├── getting-started/          Onboarding: full-stack setup, first lab, quick start
├── scenario-guides/
│   ├── CATALOG.md            All 23 scenarios — full link matrix
│   ├── zero-to-hero/         22 learner walkthroughs (TOC + Mitigation Playbook)
│   └── quick-reference/      22 command cheat sheets (TOC)
├── platform/                 Architecture, operations, detection, tooling, FAQ
├── learning-path/            Curriculum, tracks, teaching delivery, capstone
├── modules/                  Teaching cards (template + index + 22 instances)
├── guides/                   Optional integrations (Floci cloud track)
└── reference/                Scenario summaries and external resources
```

---

## Safety reminder

This test bench contains **intentionally vulnerable code** for education only.

- Use **only** in isolated environments (VM recommended).
- Always `export TESTBENCH_MODE=enabled` before labs.
- Exfiltration targets **localhost only** — never publish malicious samples.

See [FAQ](./platform/FAQ.md) and [SECURITY](../SECURITY.md).

---

## Keeping docs in sync

When scenario runtime behavior changes, update docs in lockstep using the shared tooling. The full script catalog and the doc-maintenance lifecycle live in **[Tooling & doc maintenance](./platform/TOOLING.md)**.

**Questions?** See the [FAQ](./platform/FAQ.md) or [open an issue](https://github.com/RAJANAGORI/supply-chain-attack-simulator/issues).

---

Documentation © 2024–2026 **Raja Nagori**, licensed [CC BY-NC-ND 4.0](../DOCUMENTATION-CC-BY-NC-ND.md). Software is [MIT](../LICENSE). See [LEGAL](../LEGAL.md) and [ATTRIBUTION](../ATTRIBUTION.md).
