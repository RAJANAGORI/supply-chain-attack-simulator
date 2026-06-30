# Operations runbook

Day-two operations for running, cleaning up, and validating the test bench.

## Prerequisites checklist

| Requirement | Verify |
|-------------|--------|
| Node.js 16+ | `node --version` |
| npm | `npm --version` |
| Python 3.8+ (scenarios 22+) | `python3 --version` |
| Docker (Elasticsearch, Kibana, Floci) | `docker --version` |
| Git | `git --version` |

**Full install walkthrough:** [Full-stack setup](../getting-started/FULL_STACK_SETUP.md)

## First-time setup

```bash
git clone https://github.com/RAJANAGORI/supply-chain-attack-simulator.git
cd supply-chain-attack-simulator
chmod +x START_HERE.sh scripts/*.sh
./scripts/setup.sh
source .testbench.env
```

Or use the interactive helper: `./START_HERE.sh`

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `TESTBENCH_MODE=enabled` | **Yes** for malicious paths | Safety gate for all labs |
| `SCAS_ES_URL=http://localhost:9200` | No | Live Elasticsearch capture forwarding |
| `SCAS_FLOCI_ENABLED=1` | No (cloud track) | Set via `source .floci.env` after `./scripts/floci-setup.sh` |
| `SCAS_STOP_OBSERVABILITY=1` | No | Stop ES/Kibana during `./scripts/teardown.sh` |

Persist testbench mode:

```bash
source .testbench.env
# Add to ~/.zshrc or ~/.bashrc:
# [ -f "/path/to/supply-chain-attack-simulator/.testbench.env" ] && source "/path/to/supply-chain-attack-simulator/.testbench.env"
```

## Scripts reference

| Script | Purpose |
|--------|---------|
| [`scripts/setup.sh`](../../scripts/setup.sh) | Repo-wide setup, creates `.testbench.env` |
| [`scripts/teardown.sh`](../../scripts/teardown.sh) | Kill scenario ports, remove captures & node_modules |
| [`scripts/kill-port.sh`](../../scripts/kill-port.sh) | Free one port or all ports from `ports.env` |
| [`scripts/smoke-all-scenarios.sh`](../../scripts/smoke-all-scenarios.sh) | End-to-end smoke for all 22 scenarios |
| [`scripts/elasticsearch-up.sh`](../../scripts/elasticsearch-up.sh) | Start ES + Kibana, seed runbooks |
| [`scripts/elasticsearch-down.sh`](../../scripts/elasticsearch-down.sh) | Stop observability stack |
| [`scripts/setup-kibana-data-views.sh`](../../scripts/setup-kibana-data-views.sh) | Create Kibana data views + saved searches |
| [`scripts/smoke-observability.sh`](../../scripts/smoke-observability.sh) | Validate ES indices and shippers |
| [`scripts/floci-setup.sh`](../../scripts/floci-setup.sh) | One-time Floci install (`--image` for fast start) |
| [`scripts/floci-up.sh`](../../scripts/floci-up.sh) | Start Floci emulator on :4566 |
| [`scripts/floci-down.sh`](../../scripts/floci-down.sh) | Stop Floci |
| [`scripts/floci-status.sh`](../../scripts/floci-status.sh) | Floci health check |

Cloud-track detail: [Floci integration](../guides/FLOCI_INTEGRATION.md) · [Full-stack setup](../getting-started/FULL_STACK_SETUP.md)

## Port matrix

Source of truth: [`scripts/ports.env`](../../scripts/ports.env)

| Port | Used by |
|------|---------|
| 3000 | Scenarios 01–05, 07–12 (default mock-server) |
| 3001 | Scenario 06 (credential harvester), 13 (mock-server) |
| 3002 | Scenario 14 (container mock), 06 (GitHub Actions sim) |
| 3003 | Scenario 06 (replication simulator) |
| 3015–3022 | Scenarios 15–22 (dedicated mock servers) |
| 9200 | Elasticsearch (optional) |
| 5601 | Kibana (optional) |
| 4566 | Floci AWS emulator (optional; scenarios 05, 06, 14, 17, 21) |

Free a port after a lab:

```bash
./scripts/kill-port.sh 3000
./scripts/kill-port.sh --all
```

## Standard lab workflow

1. `cd scenarios/NN-slug && export TESTBENCH_MODE=enabled && ./setup.sh`
2. **Terminal A:** start mock collector (`node infrastructure/mock-server.js` or scenario-specific)
3. **Terminal B:** run victim app per scenario README
4. Verify: `curl -s http://localhost:<PORT>/captured-data` (or `/captured-credentials` for scenario 06)
5. Blue team: read `DETECT.md`, run scenario `detection-tools/`
6. Cleanup: `./scripts/kill-port.sh <PORT>` or `./scripts/teardown.sh`

## Optional observability workflow

```bash
./scripts/elasticsearch-up.sh
./scripts/setup-kibana-data-views.sh
export SCAS_ES_URL=http://localhost:9200   # before mock server start
# run scenario ...
./scripts/smoke-observability.sh           # validate
```

See [DETECTION_AND_OBSERVABILITY.md](./DETECTION_AND_OBSERVABILITY.md).

## Optional Floci workflow (cloud track)

```bash
./scripts/floci-setup.sh --image    # once
source .testbench.env && source .floci.env
./scripts/floci-up.sh
./scripts/floci-status.sh
# scenario seed/verify under scenarios/NN-*/infrastructure/floci/
./scripts/floci-down.sh
```

See [FLOCI_INTEGRATION.md](../guides/FLOCI_INTEGRATION.md).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `EADDRINUSE` / port in use | Previous mock server still running | `./scripts/kill-port.sh <PORT>` |
| No exfil / empty captures | `TESTBENCH_MODE` not set | `export TESTBENCH_MODE=enabled` |
| Mock server not receiving | Wrong port or server not started | Match port to [CATALOG](../scenario-guides/CATALOG.md) |
| `Cannot find module` | Missing npm install | Run scenario `./setup.sh` and `npm install` in victim app |
| Scenario 11 paths missing | Setup not run | `./setup.sh` generates corporate-app/ |
| ES 404 on `_count` | Index not created yet | Run scenario or `node detection-tools/es/ship-captures.js` |
| Kibana empty Discover | Data views not created | `./scripts/setup-kibana-data-views.sh` |
| Floci not healthy | Setup incomplete or Docker not ready | `./scripts/floci-setup.sh --image` then `./scripts/floci-up.sh`; `docker logs scas-floci` |
| Port 4566 in use | Another local AWS emulator | `docker stop scas-floci` or free the port |

More: [FAQ.md](./FAQ.md) · [Full-stack setup](../getting-started/FULL_STACK_SETUP.md)

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [FULL_STACK_SETUP.md](../getting-started/FULL_STACK_SETUP.md)
- [SETUP.md](../getting-started/SETUP.md)
- [scenario-guides/CATALOG.md](../scenario-guides/CATALOG.md)
