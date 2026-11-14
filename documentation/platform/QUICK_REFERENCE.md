# Quick reference

One-page navigation for the test bench. Master index: [Documentation index](../index.md) · Full scenario link matrix: [scenario-guides/CATALOG.md](../scenario-guides/CATALOG.md)

Authoritative content lives under `documentation/`. The `docs/` directory (GitHub Pages) adds `index.html` and symlinks to this tree.

## Start here

| Doc | Purpose |
| --- | --- |
| [Documentation index](../index.md) | Master documentation index (CLI vs Command Center choice) |
| [COMMAND_CENTER.md](../getting-started/COMMAND_CENTER.md) | Browser labs (`./run.sh` → `:3100`) |
| [QUICK_START.md](../getting-started/QUICK_START.md) | CLI fast path |
| [ZERO_TO_HERO.md](../getting-started/ZERO_TO_HERO.md) | First lab for beginners |
| [FAQ.md](./FAQ.md) | Troubleshooting and common questions |
| [SETUP.md](../getting-started/SETUP.md) | Detailed setup |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Platform design |
| [DASHBOARD.md](./DASHBOARD.md) | Maintainer UI / control-plane notes |
| [OPERATIONS.md](./OPERATIONS.md) | Scripts, ports, teardown |
| [DETECTION_AND_OBSERVABILITY.md](./DETECTION_AND_OBSERVABILITY.md) | Blue team + Elasticsearch/Kibana |
| [BEST_PRACTICES.md](./BEST_PRACTICES.md) | Defensive patterns |
| [SCENARIOS.md](../reference/SCENARIOS.md) | Scenario summaries |

## Scenario guides

| Type | Index |
| --- | --- |
| Full catalog (25 scenarios) | [scenario-guides/CATALOG.md](../scenario-guides/CATALOG.md) |
| Zero-to-hero walkthroughs | [scenario-guides/zero-to-hero/README.md](../scenario-guides/zero-to-hero/README.md) |
| Quick reference cards | [scenario-guides/quick-reference/README.md](../scenario-guides/quick-reference/README.md) |

## Common commands

```bash
./START_HERE.sh         # menu: labs / workshop / docker (same as ./install.sh)
source .scas.env        # written by the installer
export TESTBENCH_MODE=enabled
./run.sh                # Command Center + ES + Floci + act → http://127.0.0.1:3100
# ./scripts/ui/conference-demo-up.sh   # remote / conference smoke
cd scenarios/01-typosquatting && ./setup.sh   # CLI path for lab 01
./scripts/setup/kill-port.sh 3000
./scripts/setup/kill-port.sh --all
./scripts/setup/teardown.sh
./scripts/observability/elasticsearch-up.sh              # optional observability
./scripts/observability/setup-kibana-data-views.sh
```

## Blue-team quick start

- Runbook pattern: `scenarios/<scenario-folder>/DETECT.md`
- Example: [scenarios/01-typosquatting/DETECT.md](../../scenarios/01-typosquatting/DETECT.md)
- Observability: [DETECTION_AND_OBSERVABILITY.md](./DETECTION_AND_OBSERVABILITY.md)

## Port allow-list

Centralized in [`scripts/setup/ports.env`](../../scripts/setup/ports.env). See [OPERATIONS.md](./OPERATIONS.md).

## Learning path

| Doc | Purpose |
| --- | --- |
| [learning-path/SCENARIO_LEARNING_PATH.md](../learning-path/SCENARIO_LEARNING_PATH.md) | Beginner → advanced order |
| [learning-path/SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md](../learning-path/SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md) | Full curriculum |
| [learning-path/CAPSTONE_RUBRIC.md](../learning-path/CAPSTONE_RUBRIC.md) | Capstone scoring |

## External references

[RESOURCES.md](../reference/RESOURCES.md)
