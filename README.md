# Supply Chain Attack Test Bench

Local labs for learning how software supply chain attacks work - and how to spot and stop them.

[![Smoke](https://github.com/RAJANAGORI/supply-chain-attack-simulator/actions/workflows/smoke.yml/badge.svg)](https://github.com/RAJANAGORI/supply-chain-attack-simulator/actions/workflows/smoke.yml)

![SCAS](./assets/supply-chain-attack-simulator-logo.png)

## Start here

Pick one path. The rest of the docs are linked so you do not have to read this whole file.

| You are... | Do this |
|----------|---------|
| New to the project | `./START_HERE.sh` (menu: labs / workshop / docker). Then `source .scas.env`. First lab is 01. [Zero to hero](documentation/getting-started/ZERO_TO_HERO.md) · [Workshop stack](documentation/getting-started/FULL_STACK_SETUP.md) |
| Prefer Docker | Option 3 in `./START_HERE.sh`, or `./docker/install.sh` · [Docker labs](documentation/getting-started/DOCKER_LABS.md) |
| Pi / USB HDD host | Optional: [`install-external.sh`](install-external.sh) - [Pi storage](documentation/getting-started/RASPBERRY_PI_STORAGE.md) |
| Prefer a browser UI | [Dashboard](documentation/platform/DASHBOARD.md) - `./scripts/ui/start-dashboard.sh` (localhost only) |
| Teaching or building a curriculum | [Scenario learning path](documentation/learning-path/SCENARIO_LEARNING_PATH.md) |
| Already comfortable with npm and VMs | [Quick start](#quick-start-experienced-users) below, then open each scenario's README |

**Safety:** Education only, in isolated environments. Read [Safety & ethics](#safety--ethics) before you run anything.

## What this is

Twenty-five small labs under `scenarios/` (`01-` through `25-`). Each one walks through an attack, shows how you might detect it, and points at mitigations. You mostly work from the CLI; there is an optional [localhost dashboard](documentation/platform/DASHBOARD.md) if you want a UI.

The dashboard turns each lab into a graded exercise: a blind **spot-the-attack drill** before anything is labeled, a **quiz gate** drawn from the lab's DETECT.md, a **purple-team reversal** where your own blocklist has to hold, **campaigns** that chain labs into one intrusion, and an **assessment score** with a printable certificate. See [DASHBOARD.md](documentation/platform/DASHBOARD.md).

Guides and learning paths live in [`documentation/`](documentation/index.md). Malicious bits only run when you opt in (for example `TESTBENCH_MODE=enabled`), and exfiltration stays aimed at localhost - see [Security notice](#security-notice).

## Themes (not a full catalog)

The labs cover a few broad areas:

- Package and registry abuse - typosquatting, dependency confusion, mirrors, lockfiles, caches, workspaces
- Broken trust - bad updates, signing gaps, submodules, SBOM tricks
- Build and delivery - pipelines, containers, multi-stage chains
- Developer tools - plugins, self-spreading patterns ([`06-sha-hulud/`](scenarios/06-sha-hulud/)), IDE/CLI-style risks
- Incident-style sims - Axios-like npm and LiteLLM-like PyPI patterns (fake packages, localhost only; [#3](https://github.com/RAJANAGORI/supply-chain-attack-simulator/issues/3), [#4](https://github.com/RAJANAGORI/supply-chain-attack-simulator/issues/4))
- Defense - detection tooling and hardening, threaded through the scenarios

For the full numbered list, see [Scenario walkthroughs](documentation/reference/SCENARIOS.md).

## Prerequisites

- Linux, macOS, or Windows with WSL2
- Python 3.8+, Node.js 16+, Git (Docker if you use the full stack or Docker labs)
- Basic comfort with npm/pip is enough to start

## Project structure

```
supply-chain-attack-simulator/
├── scenarios/                  # Labs 01-25
├── malicious-packages/         # Example packages for learning
├── detection-tools/            # Scanners and helpers
├── observability/              # Optional Elasticsearch + Kibana
├── docker/                     # Docker install hub
├── documentation/              # Canonical guides
├── docs/                       # GitHub Pages (symlinks → documentation/)
└── scripts/                    # Setup and utilities
```

## Quick start (experienced users)

### 1. Clone the repo

```bash
git clone https://github.com/RAJANAGORI/supply-chain-attack-simulator.git
cd supply-chain-attack-simulator
```

Use your own fork URL if that is what you cloned.

### 2. Install

Canonical command: `./START_HERE.sh` (same as `./install.sh`). No flags opens a menu:

```text
  1) Labs only      Node/Python. No Docker. Fast path.
  2) Workshop stack npm workspaces, Elasticsearch/Kibana, Floci.
  3) Docker labs    exec ./docker/install.sh
```

```bash
chmod +x START_HERE.sh
./START_HERE.sh
source .scas.env
```

Non-interactive workshop (`-y` still means ES + Floci, needs Docker):

```bash
./START_HERE.sh -y
source .scas.env
```

Labs only, no Docker services:

```bash
./START_HERE.sh -y --core-only
```

### 3. Run Scenario 1 (CLI)

```bash
cd scenarios/01-typosquatting
./setup.sh
node infrastructure/mock-server.js &
cd victim-app
npm install ../malicious-packages/request-lib
export TESTBENCH_MODE=enabled
npm start
curl http://localhost:3000/captured-data
```

You should see captured exercise data from the mock exfiltration endpoint (exact shape is described in `scenarios/01-typosquatting/README.md`).

### 4. Clean up

```bash
./scripts/setup/kill-port.sh 3000
# or everything:
./scripts/setup/teardown.sh
```

## Scenario index

Each folder's README has the steps. Levels match [documentation/reference/SCENARIOS.md](documentation/reference/SCENARIOS.md).

| # | Lab | Level |
|---|-----|--------|
| 01 | [Typosquatting](scenarios/01-typosquatting/) | Beginner |
| 02 | [Dependency confusion](scenarios/02-dependency-confusion/) | Beginner |
| 03 | [Compromised package](scenarios/03-compromised-package/) | Beginner |
| 04 | [Malicious update](scenarios/04-malicious-update/) | Intermediate |
| 05 | [Build system compromise](scenarios/05-build-compromise/) | Advanced |
| 06 | [Shai-Hulud (self-replicating)](scenarios/06-sha-hulud/) | Advanced |
| 07 | [Transitive dependency](scenarios/07-transitive-dependency/) | Intermediate |
| 08 | [Package lock file manipulation](scenarios/08-package-lock-file-manipulation/) | Intermediate |
| 09 | [Package signing bypass](scenarios/09-package-signing-bypass/) | Advanced |
| 10 | [Git submodule attack](scenarios/10-git-submodule-attack/) | Intermediate |
| 11 | [Registry mirror poisoning](scenarios/11-registry-mirror-poisoning/) | Advanced |
| 12 | [Workspace / monorepo attack](scenarios/12-workspace-monorepo-attack/) | Intermediate |
| 13 | [Package metadata manipulation](scenarios/13-package-metadata-manipulation/) | Intermediate |
| 14 | [Container image supply chain](scenarios/14-container-image-supply-chain-attack/) | Advanced |
| 15 | [Developer tool compromise](scenarios/15-developer-tool-compromise/) | Advanced |
| 16 | [Package cache poisoning](scenarios/16-package-cache-poisoning/) | Intermediate |
| 17 | [Multi-stage attack chain](scenarios/17-multi-stage-attack-chain/) | Advanced |
| 18 | [Package manager plugin attack](scenarios/18-package-manager-plugin-attack/) | Advanced |
| 19 | [SBOM manipulation](scenarios/19-sbom-manipulation-attack/) | Advanced |
| 20 | [Package version confusion](scenarios/20-package-version-confusion/) | Advanced |
| 21 | [Axios-style npm release (simulation)](scenarios/21-axios-compromised-release-attack/) | Advanced |
| 22 | [LiteLLM-style PyPI compromise (simulation)](scenarios/22-litellm-pypi-compromise/) | Advanced |
| 23 | [Trivy supply chain attack (simulation)](scenarios/23-trivy-supply-chain-attack/) | Advanced |
| 24 | [Slopsquatting (LLM-hallucinated names)](scenarios/24-slopsquatting/) | Intermediate |
| 25 | [Compromised reusable GitHub Action](scenarios/25-compromised-github-action/) | Advanced |

## Defense and detection

Every scenario ships a `DETECT.md` with IOCs, sample logs, and rule-style snippets, plus notes on mitigation in the README.

For workshops, you can send runbooks and events into a local Elasticsearch stack ([#22](https://github.com/RAJANAGORI/supply-chain-attack-simulator/issues/22)):

```bash
./scripts/observability/elasticsearch-up.sh
export SCAS_ES_URL=http://localhost:9200
```

See [observability/README.md](observability/README.md).

## Safety & ethics

This repo is for learning. Keep it that way.

- Run it only in isolated environments
- Do not publish these packages to public registries
- Do not point it at systems you do not own
- Be careful with anything that looks like a real credential

The samples are labeled as educational, gated for the testbench, and written so they should not do real damage when used as documented.

## Security notice

There is intentionally bad code here. Safeguards include:

- `TESTBENCH_MODE=enabled` (and similar) before malicious paths run
- Localhost-oriented exfiltration and mocks
- Clear warnings in the labs
- No real credential harvesting

## Documentation

Start at the **[documentation index](documentation/index.md)**. Same files render on the web via the [Documentation hub](docs/guide.html).

| Doc | Purpose |
|-----|---------|
| [Documentation index](documentation/index.md) | Main hub |
| [Scenario catalog](documentation/scenario-guides/CATALOG.md) | All 25 labs |
| [Full-stack setup](documentation/getting-started/FULL_STACK_SETUP.md) | SCAS + ES + Floci |
| [Docker labs](documentation/getting-started/DOCKER_LABS.md) | `./docker/install.sh` |
| [First lab in 10 minutes](documentation/getting-started/ZERO_TO_HERO.md) | Short guided start |
| [SCAS-only setup](documentation/getting-started/SETUP.md) | Core install |
| [Scenario learning path](documentation/learning-path/SCENARIO_LEARNING_PATH.md) | Beginner → advanced |
| [Architecture](documentation/platform/ARCHITECTURE.md) | How the platform fits together |
| [Operations](documentation/platform/OPERATIONS.md) | Ports, workflow, teardown |
| [Detection & observability](documentation/platform/DETECTION_AND_OBSERVABILITY.md) | Blue team + ES |
| [Best practices](documentation/platform/BEST_PRACTICES.md) | Defensive habits |
| [Quick reference](documentation/platform/QUICK_REFERENCE.md) | Commands on one page |
| [Tooling](documentation/platform/TOOLING.md) | Scripts and doc maintenance |
| [Integration guides](documentation/guides/index.md) | Floci cloud track |
| [FAQ](documentation/platform/FAQ.md) | Common problems |
| [Scenario walkthroughs](documentation/reference/SCENARIOS.md) | Numbered list + skills |
| [Resources](documentation/reference/RESOURCES.md) | External reading |
| [Observability stack](observability/README.md) | ES + Kibana |

`docs/` is the GitHub Pages site; content is symlinked from `documentation/` - see `docs/README.md`.

## Issue templates

Under `.github/ISSUE_TEMPLATE`: bug report, feature request, and scenario issue forms.

## Learning path

There is no single required order. A workable default:

1. Do **01 → 02 → 03** first.
2. Finish **01-05** before **06** (Shai-Hulud) - it is the heaviest single lab.
3. After that, pick by interest: registry/repo labs (**07, 08, 10, 12, 13, 16**), or CI/signing/container labs (**05, 09, 11, 14, 15, 17-23**).

More structure: [Scenario learning path](documentation/learning-path/SCENARIO_LEARNING_PATH.md) and [Capstone rubric](documentation/learning-path/CAPSTONE_RUBRIC.md).

## Contributing

New labs, better detection, clearer docs, and fixes are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Community standards

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)

## License and copyright

**Creator:** [Raja Nagori](https://github.com/rajanagori) · Copyright © 2024-2026

Dual licensing:

| Material | License |
|----------|---------|
| Software - scenarios, scripts, detection tools, observability | [MIT License](LICENSE) |
| Documentation - guides, modules, learning paths | [CC BY-NC-ND 4.0](DOCUMENTATION-CC-BY-NC-ND.md) |

- [LEGAL.md](LEGAL.md) - ownership
- [ATTRIBUTION.md](ATTRIBUTION.md) - how to credit SCAS
- [AUTHORS.md](AUTHORS.md) - creator and contributors
- [NOTICE](NOTICE) - distribution summary
- [CONTRIBUTING.md](CONTRIBUTING.md) - DCO and contribution terms

Fork and use the software under MIT (keep the copyright notice). Docs can be shared with attribution; do not commercially republish modified docs without permission. Do not strip copyright or claim you wrote SCAS.

## Acknowledgments

**[Floci](https://floci.io/)** - local cloud emulator ([floci-io/floci](https://github.com/floci-io/floci)), maintained by **[Hector Ventura](https://github.com/hectorvent)**.

Built with an eye toward real incidents, including SolarWinds (2020), CodeCov (2021), event-stream (2018), UA-Parser-js (2021), and Colors.js / Faker.js (2022).

## Support

- [FAQ](documentation/platform/FAQ.md) and [documentation index](documentation/index.md)
- [OPERATIONS.md](documentation/platform/OPERATIONS.md) for ports and teardown
- GitHub issues for bugs and questions

---

Use this to get better at defense. That is the point.
