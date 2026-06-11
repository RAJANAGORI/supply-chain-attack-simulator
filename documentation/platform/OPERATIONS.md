# Operations runbook

Day-two operations for running, cleaning up, and validating the test bench.

## Prerequisites checklist

| Requirement | Verify |
|-------------|--------|
| Node.js 16+ | `node --version` |
| npm | `npm --version` |
| Python 3.8+ (scenarios 22+) | `python3 --version` |
| Docker (optional observability) | `docker --version` |
| Git | `git --version` |

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

## Port matrix

Source of truth: [`scripts/ports.env`](../../scripts/ports.env)

| Port | Used by |
|------|---------|
| 3000 | Scenarios 01–05, 07–12 (default mock-server) |
| 3001 | Scenario 06 (credential harvester), 13 (mock-server) |
| 3002 | Scenario 14 (container mock), 06 (GitHub Actions sim) |
| 3003 | Reserved in allow-list |
| 3015–3022 | Scenarios 15–22 (dedicated mock servers) |
| 9200 | Elasticsearch (optional) |
| 5601 | Kibana (optional) |

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

More: [FAQ.md](./FAQ.md)

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [SETUP.md](../getting-started/SETUP.md)
- [scenario-guides/CATALOG.md](../scenario-guides/CATALOG.md)
