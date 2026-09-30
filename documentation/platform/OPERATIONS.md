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
| nektos/act (optional, labs 05 and 25) | `act --version` |

**Full install walkthrough:** [Full-stack setup](../getting-started/FULL_STACK_SETUP.md)

## Session flow

![SCAS session flow: operator, core mock/capture track, optional Elasticsearch and Floci, blue-team review](../assets/diagrams/platform/svg/scas-session-tracks.svg)

*Editable source: [`scas-session-tracks.excalidraw`](../assets/diagrams/platform/excalidraw/scas-session-tracks.excalidraw).*

## First-time setup

```bash
git clone https://github.com/RAJANAGORI/supply-chain-attack-simulator.git
cd supply-chain-attack-simulator
chmod +x START_HERE.sh
./START_HERE.sh
source .scas.env
```

`START_HERE.sh` is a wrapper around `./install.sh`. Bare run asks labs / workshop / docker. Inner helper (no npm): `./scripts/setup/setup.sh -y`.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `TESTBENCH_MODE=enabled` | **Yes** for malicious paths | Safety gate for all labs |
| `SCAS_ES_URL=http://localhost:9200` | No | Live Elasticsearch capture forwarding |
| `SCAS_FLOCI_ENABLED=1` | No (cloud track) | Set via `source .floci.env` after `./scripts/floci/floci-setup.sh` |
| `SCAS_STOP_OBSERVABILITY=1` | No | Stop ES/Kibana during `./scripts/setup/teardown.sh` |

Persist testbench mode:

```bash
source .testbench.env
# Add to ~/.zshrc or ~/.bashrc:
# [ -f "/path/to/supply-chain-attack-simulator/.testbench.env" ] && source "/path/to/supply-chain-attack-simulator/.testbench.env"
```

## Scripts reference

| Script | Purpose |
|--------|---------|
| [`scripts/setup/setup.sh`](../../scripts/setup/setup.sh) | Repo-wide setup, creates `.testbench.env` (`SCAS_YES=1` / `CI=1` / no TTY skips confirm) |
| [`scripts/setup/teardown.sh`](../../scripts/setup/teardown.sh) | Kill scenario ports, remove captures & node_modules |
| [`scripts/setup/ensure-act.sh`](../../scripts/setup/ensure-act.sh) | Install nektos/act for labs 05/25 |
| [`run.sh`](../../run.sh) / [`scripts/ui/run-everything.sh`](../../scripts/ui/run-everything.sh) | Full UI stack (ES, Floci, act, dashboard) |
| [`scripts/ui/start-dashboard.sh`](../../scripts/ui/start-dashboard.sh) | Dashboard only |
| [`scripts/ui/conference-demo-up.sh`](../../scripts/ui/conference-demo-up.sh) | Conference / remote host smoke + lab 01 check |
| [`scripts/setup/kill-port.sh`](../../scripts/setup/kill-port.sh) | Free one port or all ports from `ports.env` |
| [`scripts/smoke/smoke-all-scenarios.sh`](../../scripts/smoke/smoke-all-scenarios.sh) | End-to-end smoke for all 25 scenarios |
| [`scripts/docs/check-info-consistency.js`](../../scripts/docs/check-info-consistency.js) | Fail CI if public lab counts / indexes drift from on-disk scenarios |
| [`scripts/diagrams/check-diagram-assets.js`](../../scripts/diagrams/check-diagram-assets.js) | Fail CI if Excalidraw/SVG diagram contract drifts |
| [`scripts/observability/elasticsearch-up.sh`](../../scripts/observability/elasticsearch-up.sh) | Start ES + Kibana, seed runbooks |
| [`scripts/observability/elasticsearch-down.sh`](../../scripts/observability/elasticsearch-down.sh) | Stop observability stack |
| [`scripts/observability/setup-kibana-data-views.sh`](../../scripts/observability/setup-kibana-data-views.sh) | Create Kibana data views + saved searches |
| [`scripts/observability/smoke-observability.sh`](../../scripts/observability/smoke-observability.sh) | Validate ES indices and shippers |
| [`scripts/floci/floci-setup.sh`](../../scripts/floci/floci-setup.sh) | One-time Floci install (`--image` for fast start) |
| [`scripts/floci/floci-up.sh`](../../scripts/floci/floci-up.sh) | Start Floci emulator on :4566 |
| [`scripts/floci/floci-down.sh`](../../scripts/floci/floci-down.sh) | Stop Floci |
| [`scripts/floci/floci-status.sh`](../../scripts/floci/floci-status.sh) | Floci health check |

Cloud-track detail: [Floci integration](../guides/FLOCI_INTEGRATION.md) · [Full-stack setup](../getting-started/FULL_STACK_SETUP.md)

## Port matrix

Source of truth: [`scripts/setup/ports.env`](../../scripts/setup/ports.env)

| Port | Used by |
|------|---------|
| 3000 | Scenarios 01-05, 07-12 (default mock-server) |
| 3001 | Scenario 06 (credential harvester), 13 (mock-server) |
| 3002 | Scenario 14 (container mock), 06 (GitHub Actions sim) |
| 3003 | Scenario 06 (replication simulator) |
| 3015-3025 | Scenarios 15-25 (dedicated mock servers) |
| 3100 | Dashboard (optional UI) |
| 3101 | Control plane (optional UI; often loopback-only behind :3100 proxy) |
| 9200 | Elasticsearch (optional) |
| 5601 | Kibana (optional) |
| 4566 | Floci AWS emulator (optional; all scenarios - S3 universal; extended on 05, 06, 11, 14, 17, 19, 23) |
| 4500 | Floci web console sidecar (`/_floci/ui` - optional; started on demand) |

Early labs (01-05, 07-12) intentionally share mock collector `:3000` - they were written before the per-lab 3015-3025 scheme. Only one of those mocks can listen at a time. From the dashboard Services card use **Free :3000**, or:

```bash
./scripts/setup/kill-port.sh 3000
./scripts/setup/kill-port.sh --all
```

Labs 15-25 already use dedicated ports and do not collide with `:3000`.
## Standard lab workflow

1. `cd scenarios/NN-slug && export TESTBENCH_MODE=enabled && ./setup.sh`
2. **Terminal A:** start mock collector (`node infrastructure/mock-server.js` or scenario-specific)
3. **Terminal B:** run victim app per scenario README
4. Verify: `curl -s http://localhost:<PORT>/captured-data` (or `/captured-credentials` for scenario 06)
5. Blue team: read `DETECT.md`, run scenario `detection-tools/`
6. Cleanup: `./scripts/setup/kill-port.sh <PORT>` or `./scripts/setup/teardown.sh`

## Optional observability workflow

```bash
./scripts/observability/elasticsearch-up.sh
./scripts/observability/setup-kibana-data-views.sh
export SCAS_ES_URL=http://localhost:9200   # before mock server start
# run scenario ...
./scripts/observability/smoke-observability.sh           # validate
```

See [DETECTION_AND_OBSERVABILITY.md](./DETECTION_AND_OBSERVABILITY.md).

## Optional Floci workflow (cloud track)

```bash
./scripts/floci/floci-setup.sh --image    # once
source .testbench.env && source .floci.env
./scripts/floci/floci-up.sh
./scripts/floci/floci-status.sh
# scenario seed/verify under scenarios/NN-*/infrastructure/floci/
./scripts/floci/floci-down.sh
```

See [FLOCI_INTEGRATION.md](../guides/FLOCI_INTEGRATION.md).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `EADDRINUSE` / port in use | Previous mock server still running | `./scripts/setup/kill-port.sh <PORT>` |
| No exfil / empty captures | `TESTBENCH_MODE` not set | `export TESTBENCH_MODE=enabled` |
| Mock server not receiving | Wrong port or server not started | Match port to [CATALOG](../scenario-guides/CATALOG.md) |
| `Cannot find module` | Missing npm install | Run scenario `./setup.sh` and `npm install` in victim app |
| Scenario 11 paths missing | Setup not run | `./setup.sh` generates corporate-app/ |
| ES 404 on `_count` | Index not created yet | Run scenario or `node detection-tools/es/ship-captures.js` |
| Kibana empty Discover | Data views not created | `./scripts/observability/setup-kibana-data-views.sh` |
| Floci not healthy | Setup incomplete or Docker not ready | `./scripts/floci/floci-setup.sh --image` then `./scripts/floci/floci-up.sh`; `docker logs scas-floci` |
| Floci UI: Permission denied | Docker socket not usable inside `scas-floci` | Re-run `./scripts/floci/floci-up.sh` (sets `FLOCI_RUN_AS_ROOT=true`, `:z` sock mount). Confirm `curl -s localhost:4566/_floci/ui/status` |
| Port 4566 in use | Another local AWS emulator | `docker stop scas-floci` or free the port |

More: [FAQ.md](./FAQ.md) · [Full-stack setup](../getting-started/FULL_STACK_SETUP.md)

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [FULL_STACK_SETUP.md](../getting-started/FULL_STACK_SETUP.md)
- [SETUP.md](../getting-started/SETUP.md)
- [scenario-guides/CATALOG.md](../scenario-guides/CATALOG.md)
