# Supply Chain Attack Simulator - Documentation

Guides for learners, blue-team practice, and instructors.

Canonical Markdown lives in `documentation/`. The [`docs/`](../docs/) folder is the GitHub Pages site (`index.html`, [`guide.html`](../docs/guide.html)) and symlinks back here - edit this tree, not `docs/`.

Browse on the web: [Documentation hub (`guide.html`)](../docs/guide.html)

Same 25 labs either way. Attack theory and `DETECT.md` are shared. Only the driver changes.

---

## Pick how you will run labs

| Driver | Best for | Start here |
|--------|----------|------------|
| Command Center (recommended for learning / demos) | Storyboard UI, Campaign, Classroom, Observatory | [Command Center guide](./getting-started/COMMAND_CENTER.md) - `./run.sh` - open `:3100` |
| CLI | Scripts, CI, headless debugging, raw `setup.sh` | [Quick start](./getting-started/QUICK_START.md) - `./START_HERE.sh` - scenario README |

Both paths should land on Scenario 01 and its [DETECT.md](../scenarios/01-typosquatting/DETECT.md).

---

## Start by role

| You are... | Start here | Then |
|----------|------------|------|
| New to SCAS | [Command Center](./getting-started/COMMAND_CENTER.md) or [first lab (CLI)](./getting-started/ZERO_TO_HERO.md) | [Scenario 01 walkthrough](./scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_01.md) |
| Experienced developer | [Quick start (CLI)](./getting-started/QUICK_START.md) · [Docker labs](./getting-started/DOCKER_LABS.md) | [Scenario catalog](./scenario-guides/CATALOG.md) |
| Blue-team / detection | [Detection & observability](./platform/DETECTION_AND_OBSERVABILITY.md) | `scenarios/*/DETECT.md` (IOCs + mitigation) |
| Instructor / workshop lead | [Teaching delivery pack](./learning-path/TEACHING_DELIVERY_PACK.md) · [Command Center](./getting-started/COMMAND_CENTER.md) | [Teaching modules](./modules/index.md) |
| Running the observability stack | [Operations](./platform/OPERATIONS.md) | [Observability stack](../observability/README.md) · [Command Center](./getting-started/COMMAND_CENTER.md) |
| Maintainer / contributor | [Tooling & doc maintenance](./platform/TOOLING.md) · [UI / control-plane notes](./platform/DASHBOARD.md) | [CONTRIBUTING](../CONTRIBUTING.md) |

---

## Browse by task

- Set up the lab - [Full-stack setup](./getting-started/FULL_STACK_SETUP.md) · [Docker labs](./getting-started/DOCKER_LABS.md) · [SETUP](./getting-started/SETUP.md) · [Operations](./platform/OPERATIONS.md) · [FAQ](./platform/FAQ.md)
- Run Command Center - [Command Center](./getting-started/COMMAND_CENTER.md) (`./run.sh` or `./scripts/ui/conference-demo-up.sh`)
- Run one scenario - [Scenario catalog](./scenario-guides/CATALOG.md) - Labs → NN in the UI, or the scenario README for CLI
- Learn an attack class - [Zero-to-hero walkthroughs](./scenario-guides/zero-to-hero/index.md) (each guide has a "Run this lab" box for both drivers)
- Detect & hunt - [Detection & observability](./platform/DETECTION_AND_OBSERVABILITY.md) · [Best practices](./platform/BEST_PRACTICES.md)
- Teach a course - [Learning path](./learning-path/index.md) · [Modules](./modules/index.md) · [Capstone rubric](./learning-path/CAPSTONE_RUBRIC.md)
- Optional cloud track - [Floci integration guide](./guides/FLOCI_INTEGRATION.md)
- One-page commands - [Quick reference](./platform/QUICK_REFERENCE.md)

---

## Documentation map

| Section | Index | What's inside |
|---------|-------|---------------|
| Getting started | [getting-started/](./getting-started/index.md) | Command Center, CLI quick start, full-stack setup, first lab |
| Scenario guides | [scenario-guides/](./scenario-guides/index.md) | The 25-lab [catalog](./scenario-guides/CATALOG.md), zero-to-hero walkthroughs, quick-reference cards |
| Platform & operations | [platform/](./platform/index.md) | Architecture, maintainer UI notes, operations, detection, tooling, FAQ |
| Learning path | [learning-path/](./learning-path/index.md) | Curriculum, tracks, teaching delivery, capstone rubric |
| Teaching modules | [modules/](./modules/index.md) | Instructor cards for all 25 scenarios + reusable template |
| Integration guides | [guides/](./guides/index.md) | Optional integrations (Floci local-AWS cloud track) |
| Reference | [reference/](./reference/index.md) | Scenario summaries and external resources |
| Governance | [LEGAL](../LEGAL.md) · [ATTRIBUTION](../ATTRIBUTION.md) · [AUTHORS](../AUTHORS.md) | Copyright, licensing, attribution |

---

## Folder map

```text
documentation/
├── index.md                  ← YOU ARE HERE (canonical navigation hub)
├── README.md                 Thin pointer for GitHub folder view → this index
├── getting-started/          Command Center + CLI onboarding
├── scenario-guides/
│   ├── CATALOG.md            All 25 scenarios - full link matrix
│   ├── zero-to-hero/         25 learner walkthroughs (TOC + Mitigation Playbook)
│   └── quick-reference/      25 command cheat sheets (TOC)
├── platform/                 Architecture, operations, detection, tooling, FAQ
├── learning-path/            Curriculum, tracks, teaching delivery, capstone
├── modules/                  Teaching cards (template + index + 25 instances)
├── guides/                   Optional integrations (Floci cloud track)
└── reference/                Scenario summaries and external resources
```

---

## Safety reminder

This test bench has intentionally vulnerable code for education only.

- Use only in isolated environments (a VM is a good idea).
- Always `export TESTBENCH_MODE=enabled` before labs.
- Exfiltration targets localhost only - never publish malicious samples.

See [FAQ](./platform/FAQ.md) and [SECURITY](../SECURITY.md).

---

## Keeping docs in sync

When scenario behavior changes, update the docs with the shared tooling. Script catalog and lifecycle: [Tooling & doc maintenance](./platform/TOOLING.md).

Questions? [FAQ](./platform/FAQ.md) or [open an issue](https://github.com/RAJANAGORI/supply-chain-attack-simulator/issues).

---

Documentation © 2024-2026 Raja Nagori, licensed [CC BY-NC-ND 4.0](../DOCUMENTATION-CC-BY-NC-ND.md). Software is [MIT](../LICENSE). See [LEGAL](../LEGAL.md) and [ATTRIBUTION](../ATTRIBUTION.md).
