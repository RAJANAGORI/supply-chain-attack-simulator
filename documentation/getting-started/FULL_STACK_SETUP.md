# Full-stack setup - SCAS + Elasticsearch + Floci

> [Documentation](../index.md) › [Getting started](./index.md) › Full-stack setup

Install SCAS on an isolated lab machine (macOS, Linux, or WSL2): the core labs, optional Elasticsearch/Kibana, and Floci for the cloud-track labs.

Shorter paths: [Quick start](./QUICK_START.md) (SCAS only, ~5 min) · [Complete setup](./SETUP.md) (install detail) · [Floci integration](../guides/FLOCI_INTEGRATION.md) (cloud track only)

### One-shot installer

After cloning, with Docker running, from the repo root:

```bash
chmod +x START_HERE.sh
./START_HERE.sh -y
```

Bare `./START_HERE.sh` (no flags) asks labs / workshop / docker. `-y` is the workshop stack so old scripts do not change meaning. Compose labs: [`./docker/install.sh`](../../docker/install.sh) or pick 3 in the menu; notes in [DOCKER_LABS.md](./DOCKER_LABS.md).

The workshop installer covers prerequisites, `TESTBENCH_MODE`, npm workspaces + `detection-tools`, Elasticsearch/Kibana, Floci, lookalike harvest secrets (generated locally - see `scenarios/_shared/LOOKALIKE_SECRETS.md`), and `.scas.env`.

USB HDD / Raspberry Pi only: use [`install-external.sh`](../../install-external.sh) so Docker data lands on that disk first. See [Raspberry Pi storage](./RASPBERRY_PI_STORAGE.md). Everyone else stays on `./START_HERE.sh`.

```bash
source .scas.env                 # every session
./run.sh                         # recommended: ES + Floci + act + dashboard
# or UI only:
./scripts/ui/start-dashboard.sh
```

On a remote demo host after pull: `./scripts/ui/conference-demo-up.sh` (see [DASHBOARD.md](../platform/DASHBOARD.md)).

| Flag | Effect |
|------|--------|
| `-y` / `--yes` | Non-interactive |
| `--core-only` | SCAS + npm only (no ES, no Floci) |
| `--skip-es` | Skip Elasticsearch/Kibana |
| `--skip-floci` | Skip Floci |
| `--no-start` | Configure / pull images but do not start containers |
| `--floci-build` | Build Floci from vendor source instead of `--image` |
| `--with-ui` | Exec `./scripts/ui/start-dashboard.sh` at the end |

Manual step-by-step remains below if you prefer to install piece by piece.

---

## Before you start

### What you are installing

| Component | Purpose | Required? |
|-----------|---------|-----------|
| SCAS core | 25 hands-on supply-chain attack labs | Yes |
| Elasticsearch + Kibana | Index detection runbooks and lab events for blue-team practice | Optional (recommended for workshops) |
| Floci | Local AWS emulator (S3 universal; ECR/IAM/pipeline on select labs) | Optional (all 25 scenarios; extended 05, 06, 11, 14, 17, 19, 23) |

### Safety rules (non-negotiable)

- Use only on an isolated VM or lab machine - never production.
- All malicious behavior targets localhost only.
- Set `TESTBENCH_MODE=enabled` before running attack payloads (`source .testbench.env`).
- Do not expose ports 9200, 5601, or 4566 to the public internet.

---

## Part 0 - Prerequisites

### Software

| Tool | Version | Used for |
|------|---------|----------|
| Git | any recent | clone the repo |
| Node.js | 16+ (20 recommended) | scenarios, mock servers, detection tools |
| npm | 7+ | package installs in labs |
| Python 3 | 3.8+ (3.11 recommended) | scenario 22 and some tooling |
| Docker Desktop (or Docker Engine + Compose v2) | recent | Elasticsearch, Kibana, Floci |

macOS (Homebrew example)

```bash
brew install git node python@3.11
brew install --cask docker   # open Docker Desktop; wait until "running"
```

Verify

```bash
git --version
node --version    # v16+
npm --version
python3 --version
docker --version
docker compose version
```

### Hardware

| Setup | RAM | Disk |
|-------|-----|------|
| SCAS only | 4 GB+ | ~2 GB |
| SCAS + Elasticsearch + Kibana | 8 GB+ | ~5 GB |
| Full stack (SCAS + ES + Floci) | 12-16 GB recommended | ~8 GB+ |

---

## Part 1 - Clone and base install

### Step 1: Clone the repository

```bash
git clone https://github.com/RAJANAGORI/supply-chain-attack-simulator.git
cd supply-chain-attack-simulator
```

### Step 2: Run the main setup script

```bash
chmod +x START_HERE.sh
./START_HERE.sh
source .scas.env
```

`START_HERE.sh` execs `./install.sh`. Pick 1 for labs only, 2 for this workshop stack, 3 for Docker labs. `./install.sh` itself also runs `scripts/setup/setup.sh` (chmod, `.testbench.env`, dirs) before npm.

### Step 3: Load the testbench environment (every new terminal)

From the repo root:

```bash
source .testbench.env
echo $TESTBENCH_MODE   # must print: enabled
```

Persist in your shell profile (adjust the path):

```bash
echo '[ -f "$HOME/path/to/supply-chain-attack-simulator/.testbench.env" ] && source "$HOME/path/to/supply-chain-attack-simulator/.testbench.env"' >> ~/.zshrc
```

---

## Part 2 - Elasticsearch + Kibana (observability)

Do this once per machine; start/stop per lab session. Full reference: [Detection & observability](../platform/DETECTION_AND_OBSERVABILITY.md).

### Step 1: Start the stack

From repo root:

```bash
chmod +x scripts/observability/elasticsearch-up.sh scripts/observability/elasticsearch-down.sh \
  scripts/observability/setup-kibana-data-views.sh scripts/observability/smoke-observability.sh
./scripts/observability/elasticsearch-up.sh
```

This will:

1. Start Elasticsearch on http://localhost:9200
2. Start Kibana on http://localhost:5601
3. Create indices `scas-rules` and `scas-detections`
4. Load all 25 scenario `DETECT.md` runbooks into Elasticsearch
5. Set up Kibana data views (when Kibana is ready)

First run can take 2-5 minutes while Docker pulls images.

### Step 2: Open Kibana

On the same machine:

- Kibana: http://localhost:5601
- Elasticsearch health: http://localhost:9200/_cluster/health

In Kibana → Discover, you should see data views SCAS Rules and SCAS Detections.

If data views are missing:

```bash
./scripts/observability/setup-kibana-data-views.sh
```

### Step 3: Enable live capture forwarding (opt-in)

So mock servers index exfil events automatically:

```bash
export SCAS_ES_URL=http://localhost:9200
```

Persist for every session:

```bash
echo 'export SCAS_ES_URL=http://localhost:9200' >> .testbench.env
source .testbench.env
```

Without `SCAS_ES_URL`, labs still work - captures stay in local JSON files only.

### Step 4: Verify observability

```bash
./scripts/observability/smoke-observability.sh
```

Expect `PASS` for rules count and detections after shipping.

---

## Part 3 - Floci (AWS emulator)

Required for the optional cloud track on all 25 scenarios (S3 mirror); extended primitives on 05, 06, 11, 14, 17, 19, 23. Per-scenario detail: [Floci integration guide](../guides/FLOCI_INTEGRATION.md).

### Step 1: One-time Floci setup

From repo root, pick one option:

Option A - Fast (recommended)

Published Docker image; no Java build.

```bash
./scripts/floci/floci-setup.sh --image
```

Option B - Build from source

Clones `floci-io/floci` into `vendor/floci-aws` (~5-15 min first time).

```bash
./scripts/floci/floci-setup.sh
```

This creates:

- `infrastructure/floci/` - Docker Compose config
- `.floci.env` - AWS endpoint variables for labs
- `vendor/floci-aws/` - Floci source (Option B only)

### Step 2: Start Floci (each lab session)

```bash
./scripts/floci/floci-up.sh
./scripts/floci/floci-status.sh
```

Floci listens on http://127.0.0.1:4566 (container name: `scas-floci`).

### Step 3: Load Floci environment

```bash
source .floci.env
echo $SCAS_FLOCI_ENABLED   # must print: 1
```

---

## Part 4 - "Everything on" session layout

Use three terminals for the full workshop stack:

| Terminal | Role | Commands |
|----------|------|----------|
| T1 - Infrastructure | Long-running services | ES (if not up), Floci, scenario mock servers |
| T2 - Lab work | Run attacks, npm, scripts | Scenario steps per README |
| T3 - Blue team (optional) | curl, detectors, Kibana | Verification |

T1 - Start everything (repo root)

```bash
source .testbench.env
source .floci.env
export SCAS_ES_URL=http://localhost:9200

# If not already running:
./scripts/observability/elasticsearch-up.sh
./scripts/floci/floci-up.sh
```

---

## Part 5 - Prove it works: Scenario 01 (no Floci)

Best first lab - typosquatting. Mock server on port 3000 only.

T1 - Mock server

```bash
cd scenarios/01-typosquatting
./setup.sh
node infrastructure/mock-server.js
```

Leave this running.

T2 - Run the attack

```bash
cd supply-chain-attack-simulator   # repo root
source .testbench.env
export SCAS_ES_URL=http://localhost:9200   # optional

cd scenarios/01-typosquatting/victim-app
npm install ../malicious-packages/request-lib
npm start
```

T3 - Verify

```bash
curl http://localhost:3000/captured-data

# Optional: backfill Elasticsearch
node detection-tools/es/ship-captures.js

# Optional: package scanner
node detection-tools/package-scanner.js scenarios/01-typosquatting/victim-app
```

In Kibana → Discover → SCAS Detections, filter `scenario_id: "01"`.

Walkthrough: [Zero to Hero - Scenario 01](../scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_01.md)

---

## Part 6 - Prove Floci works: Scenario 05 (build compromise)

T1 - Services

```bash
cd supply-chain-attack-simulator   # repo root
source .testbench.env
source .floci.env
export SCAS_ES_URL=http://localhost:9200

./scripts/floci/floci-status.sh   # must be healthy

cd scenarios/05-build-compromise
./setup.sh
node infrastructure/mock-server.js &
chmod +x infrastructure/floci/*.sh
./infrastructure/floci/seed.sh
```

T2 - Run build attack

```bash
cd scenarios/05-build-compromise/compromised-build
set -a && source .env.lab 2>/dev/null || source ../../_shared/lookalike-secrets.env; set +a
npm run build
```

T3 - Verify both tracks

```bash
# HTTP mock (port 3000)
curl http://localhost:3000/captured-data

# Floci S3
./infrastructure/floci/verify.sh

# Blue-team detector
../../detection-tools/floci/s3-exfil-check.sh 05
```

More: `scenarios/05-build-compromise/FLOCI.md` · [Floci integration guide](../guides/FLOCI_INTEGRATION.md)

---

## Part 7 - What runs where (ports)

| Port | Service |
|------|---------|
| 9200 | Elasticsearch |
| 5601 | Kibana |
| 4566 | Floci (AWS emulator) |
| 3000-3023 | Scenario mock servers (see [`scripts/setup/ports.env`](../../scripts/setup/ports.env)) |

Floci uses 4566 only - it does not start floci-ui on 3000/3001, so it will not conflict with SCAS mock servers.

Full matrix: [Operations runbook](../platform/OPERATIONS.md#port-matrix)

---

## Part 8 - Stop and clean up

Stop Floci

```bash
./scripts/floci/floci-down.sh
```

Stop Elasticsearch

```bash
./scripts/observability/elasticsearch-down.sh
# Remove persisted ES data:
./scripts/observability/elasticsearch-down.sh --volumes
```

Reset lab artifacts (ports, captures, node_modules)

```bash
./scripts/setup/teardown.sh
```

Free a single port

```bash
./scripts/setup/kill-port.sh 3000
```

---

## Part 9 - Session cheat sheet

```bash
# === ONE-TIME ===
git clone https://github.com/RAJANAGORI/supply-chain-attack-simulator.git
cd supply-chain-attack-simulator
./install.sh -y                 # preferred: core + ES + Floci + .scas.env
# or piece-by-piece:
# ./scripts/setup/setup.sh
# ./scripts/floci/floci-setup.sh --image
# ./scripts/observability/elasticsearch-up.sh

# === EVERY SESSION (repo root) ===
source .scas.env                # TESTBENCH_MODE + SCAS_ES_URL + .floci.env
# (equivalent: source .testbench.env && source .floci.env && export SCAS_ES_URL=http://localhost:9200)

./scripts/floci/floci-up.sh          # if you used --no-start, or after floci-down
# start scenario mock server(s) in scenario folder

# === EACH SCENARIO ===
cd scenarios/NN-<name>
./setup.sh
cat README.md

# === SHUTDOWN ===
./scripts/floci/floci-down.sh
./scripts/observability/elasticsearch-down.sh
./scripts/setup/teardown.sh
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `TESTBENCH_MODE not enabled` | `source .testbench.env` from repo root |
| Port already in use | `./scripts/setup/kill-port.sh 3000` or `./scripts/setup/teardown.sh` |
| Docker not running | Start Docker Desktop; wait until ready |
| Elasticsearch won't start | Need ~8 GB RAM free; `docker logs scas-elasticsearch` |
| Floci not healthy | `./scripts/floci/floci-setup.sh --image` then `./scripts/floci/floci-up.sh`; `docker logs scas-floci` |
| Floci port 4566 conflict | `docker stop scas-floci` or stop other local AWS emulators |
| Kibana empty | `./scripts/observability/setup-kibana-data-views.sh` |
| No ES detections | Run a scenario first, then `node detection-tools/es/ship-captures.js` |
| Permission denied on scripts | `find scripts -name '*.sh' -type f -exec chmod +x {} + scenarios/*/setup.sh` |

More: [FAQ](../platform/FAQ.md) · [Operations](../platform/OPERATIONS.md)

---

## Where to go next

1. [First lab quick start](./ZERO_TO_HERO.md)
2. [Scenario catalog](../scenario-guides/CATALOG.md)
3. [Detection & observability](../platform/DETECTION_AND_OBSERVABILITY.md)
4. [Floci cloud-track scenarios](../guides/FLOCI_INTEGRATION.md) - all 25 (S3); extended 05, 06, 11, 14, 17, 19, 23

---

Related: [Getting started index](./index.md) · [Operations](../platform/OPERATIONS.md) · [Tooling](../platform/TOOLING.md) · [↑ Documentation index](../index.md)
