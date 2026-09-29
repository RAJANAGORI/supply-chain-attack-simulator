# SCAS Docker install hub

Docker path for the platform (Elasticsearch, Kibana, Floci) and the 23 scenario labs.

## Quick start

```bash
# Interactive menu
./docker/install.sh

# One-shot: platform + Scenario 01
./docker/install.sh --oneshot

# One scenario only
./docker/install.sh --scenario 01
./docker/install.sh --scenario 22-litellm-pypi-compromise

# Platform only
./docker/install.sh --platform-only

# Status / teardown
./docker/install.sh --status
./docker/install.sh --down          # labs only
./docker/install.sh --down-all      # labs + platform
```

## Two modes

1. **One-shot** - ES (:9200), Kibana (:5601), Floci (:4566), then Scenario 01.
2. **Scenario picker** - any compose-backed lab; optionally start the platform too.

## Per-lab commands (without the hub)

```bash
cd scenarios/NN-slug
docker compose up -d --build
docker compose exec victim bash
./verify.sh
docker compose down -v
```

## Command Center UI

```bash
./docker/install.sh --ui-only
```

- Dashboard http://localhost:3100
- Control plane http://localhost:3101
- Marketing https://simulator.rajanagori.in/

Control plane uses `SCAS_LAB_BACKEND=docker` to start scenario compose stacks via the Docker socket.

## Floci + Elasticsearch from labs

Victims talk to Floci at `host.docker.internal:4566` and ES at `:9200`. Set `SCAS_FLOCI_ENABLED=0` to disable the S3 mirror path.

## Rules

- Run **one scenario lab at a time** (many share host ports such as 3000). Use `SCAS_FORCE=1` only if you know ports will not collide.
- Labs set `TESTBENCH_MODE=enabled` and keep simulated exfiltration on **localhost** only.
- Regenerate lab compose files with: `node scripts/docker/scaffold-scenario-compose.js`

## Docs

- [DOCKER_LABS.md](../documentation/getting-started/DOCKER_LABS.md)
- Host (non-Docker) install: [`../install.sh`](../install.sh)
