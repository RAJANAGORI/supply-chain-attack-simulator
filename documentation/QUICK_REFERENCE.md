# Quick reference

One-page navigation for the test bench. Authoritative content lives under **`documentation/`** (this folder). The **`docs/`** directory (GitHub Pages) adds **`index.html`** and **symlinks** to this tree: top-level guides plus **`learning-path/`**, **`modules/`**, and **`scenario-guides/`**—see **`docs/README.md`**.

## Start here

| Doc | Purpose |
|-----|---------|
| [README.md](./README.md) | Docs map and index |
| [ZERO_TO_HERO.md](./ZERO_TO_HERO.md) | Full beginner walkthrough |
| [QUICK_START.md](./QUICK_START.md) | Fast setup |
| [SETUP.md](./SETUP.md) | Detailed setup |
| [BEST_PRACTICES.md](./BEST_PRACTICES.md) | Defensive patterns |
| [SCENARIOS.md](./SCENARIOS.md) | Scenario list and port cleanup |

## Scenario guides

- **Deep dives**: [scenario-guides/zero-to-hero/](scenario-guides/zero-to-hero/) — `ZERO_TO_HERO_SCENARIO_NN.md`
- **Cheat sheets**: [scenario-guides/quick-reference/](scenario-guides/quick-reference/) — `QUICK_REFERENCE_SCENARIO_NN.md`

## Common commands

```bash
export TESTBENCH_MODE=enabled
cd scenarios/01-typosquatting && ./setup.sh
sudo ./scripts/kill-port.sh 3000   # free port after a scenario
```

## Learning path

| Doc | Purpose |
|-----|---------|
| [learning-path/SCENARIO_LEARNING_PATH.md](./learning-path/SCENARIO_LEARNING_PATH.md) | Beginner → advanced order |
| [learning-path/SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md](./learning-path/SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md) | Curriculum landing |
| [learning-path/CAPSTONE_RUBRIC.md](./learning-path/CAPSTONE_RUBRIC.md) | Capstone scoring |

## External references

See [RESOURCES.md](./RESOURCES.md) for tools, articles, and incident writeups.
