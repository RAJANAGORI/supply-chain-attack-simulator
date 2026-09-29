# Docker labs (local)

Run SCAS with Docker: platform services (ES, Kibana, Floci) and any of the 23 scenario labs.

## Install hub

```bash
./START_HERE.sh
# pick 3) Docker labs
# or:
./docker/install.sh
```

| Option | What it does |
|--------|----------------|
| One-shot | Elasticsearch + Kibana + Floci + Scenario 01 |
| Scenario picker | Any of the 23 compose labs (optional platform) |
| Platform only | ES (:9200) + Kibana (:5601) + Floci (:4566) |

Without the menu:

```bash
./docker/install.sh --oneshot
./docker/install.sh --scenario 07
./docker/install.sh --scenario 22 --with-platform
./docker/install.sh --status
./docker/install.sh --down-all
```

More detail: [`docker/README.md`](../../docker/README.md).

## Per-lab commands

```bash
cd scenarios/01-typosquatting   # or any NN-* folder
docker compose up -d --build
docker compose exec victim bash
./verify.sh
docker compose down -v
```

Run **one scenario lab at a time** - many share host port 3000.

## Command Center UI (`apps/`)

```bash
./docker/install.sh --ui-only
# or with a lab:
./docker/install.sh --scenario 01 --with-ui
```

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3100 |
| Control plane | http://localhost:3101/api/health |
| Public marketing | https://simulator.rajanagori.in/ |

With Docker, the control plane starts labs via `docker compose` (`SCAS_LAB_BACKEND=docker`) and the mounted Docker socket.

On the host without UI containers: `./scripts/ui/start-dashboard.sh`

## Floci from lab containers

Inside a lab container, Floci is at **`http://host.docker.internal:4566`**, not `localhost:4566`.

Compose sets on every victim:

- `SCAS_FLOCI_ENABLED=1` (set `SCAS_FLOCI_ENABLED=0` to turn off)
- `SCAS_FLOCI_ENDPOINT` / `AWS_ENDPOINT_URL` → `host.docker.internal:4566`
- `extra_hosts: host.docker.internal:host-gateway` on the lab network owner (`mock-c2` / `mock-cdn`)

Mocks forward to Elasticsearch at `SCAS_ES_URL=http://host.docker.internal:9200`.

```bash
./docker/install.sh --oneshot   # platform (incl. Floci) + Scenario 01
# optional cloud-track seed from host:
cd scenarios/01-typosquatting && ./infrastructure/floci/seed.sh
```

## Safety

- Containers set `TESTBENCH_MODE=enabled`.
- Simulated C2 exfiltration stays on **localhost** inside the lab netns; Floci/ES use `host.docker.internal` only.
- Do not publish malicious packages or point payloads at the public internet.

## Regenerating compose files

```bash
node scripts/docker/scaffold-scenario-compose.js
```

Metadata: [`scripts/docker/scenario-compose-meta.json`](../../scripts/docker/scenario-compose-meta.json).

## Host (non-Docker) path

Still works: [Quick start](./QUICK_START.md) · [Full-stack setup](./FULL_STACK_SETUP.md) · root `./START_HERE.sh`

**Next:** [Scenario catalog](../scenario-guides/CATALOG.md) · [↑ Getting started](./index.md)
