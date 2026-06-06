# Quick reference

One-page navigation for the test bench. **Master index:** [README.md](./README.md) · **Full scenario link matrix:** [scenario-guides/CATALOG.md](./scenario-guides/CATALOG.md)

Authoritative content lives under **`documentation/`**. The **`docs/`** directory (GitHub Pages) adds **`index.html`** and **symlinks** to this tree.

## Start here

| Doc | Purpose |
| --- | --- |
| [README.md](./README.md) | **Master documentation index** |
| [FAQ.md](./FAQ.md) | Troubleshooting and common questions |
| [ZERO_TO_HERO.md](./ZERO_TO_HERO.md) | First lab for beginners |
| [QUICK_START.md](./QUICK_START.md) | Fast setup |
| [SETUP.md](./SETUP.md) | Detailed setup |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Platform design |
| [OPERATIONS.md](./OPERATIONS.md) | Scripts, ports, teardown |
| [DETECTION_AND_OBSERVABILITY.md](./DETECTION_AND_OBSERVABILITY.md) | Blue team + Elasticsearch/Kibana |
| [BEST_PRACTICES.md](./BEST_PRACTICES.md) | Defensive patterns |
| [SCENARIOS.md](./SCENARIOS.md) | Scenario summaries |

## Scenario guides

| Type | Index |
| --- | --- |
| **Full catalog (22 scenarios)** | [scenario-guides/CATALOG.md](./scenario-guides/CATALOG.md) |
| Zero-to-hero walkthroughs | [scenario-guides/zero-to-hero/README.md](./scenario-guides/zero-to-hero/README.md) |
| Quick reference cards | [scenario-guides/quick-reference/README.md](./scenario-guides/quick-reference/README.md) |

## Common commands

```bash
source .testbench.env   # created by scripts/setup.sh
export TESTBENCH_MODE=enabled
cd scenarios/01-typosquatting && ./setup.sh
./scripts/kill-port.sh 3000
./scripts/kill-port.sh --all
./scripts/teardown.sh
./scripts/elasticsearch-up.sh              # optional observability
./scripts/setup-kibana-data-views.sh
```

## Blue-team quick start

- Runbook pattern: `scenarios/<scenario-folder>/DETECT.md`
- Example: [scenarios/01-typosquatting/DETECT.md](../scenarios/01-typosquatting/DETECT.md)
- Observability: [DETECTION_AND_OBSERVABILITY.md](./DETECTION_AND_OBSERVABILITY.md)

## Port allow-list

Centralized in [`scripts/ports.env`](../scripts/ports.env). See [OPERATIONS.md](./OPERATIONS.md).

## Learning path

| Doc | Purpose |
| --- | --- |
| [learning-path/SCENARIO_LEARNING_PATH.md](./learning-path/SCENARIO_LEARNING_PATH.md) | Beginner → advanced order |
| [learning-path/SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md](./learning-path/SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md) | Full curriculum |
| [learning-path/CAPSTONE_RUBRIC.md](./learning-path/CAPSTONE_RUBRIC.md) | Capstone scoring |

## External references

[RESOURCES.md](./RESOURCES.md) · [ROADMAP.md](./ROADMAP.md)
