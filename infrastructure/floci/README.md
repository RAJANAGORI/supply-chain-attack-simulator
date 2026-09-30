# SCAS Floci orchestration

Local AWS emulator for cloud-track scenarios **05, 06, 14, 17, 21**.

## One-time setup

```bash
# From repo root - clones github.com/floci-io/floci → vendor/floci-aws and builds Docker image
./scripts/floci/floci-setup.sh

# Fast path (no clone, no Java build - uses published image)
./scripts/floci/floci-setup.sh --image
```

## Daily use

```bash
./scripts/floci/floci-up.sh          # start scas-floci on :4566
source .floci.env              # SCAS_FLOCI_ENABLED=1 + AWS endpoint vars
./scripts/floci/floci-status.sh      # health check
# CLI labs: scenarios/NN-*/infrastructure/floci/{seed,verify}.sh
# Web console: http://127.0.0.1:4566/_floci/ui  (pulls floci-ui → :4500)
./scripts/floci/floci-down.sh        # stop
```

`floci-up.sh` sets `DOCKER_GID` and `FLOCI_RUN_AS_ROOT=true` so the Docker socket is usable inside the container (required for the web console sidecar and for Lambda/ECR/ECS).

## Layout

| Path | Purpose |
|------|---------|
| `vendor/floci-aws/` | Git clone of [floci-io/floci](https://github.com/floci-io/floci) (gitignored) |
| `docker-compose.yml` | Build from vendor |
| `docker-compose.image.yml` | Published `floci/floci:latest-compat` |
| `data/` | Persistent emulator state |
| `init/ready.d/` | Optional boot hooks (AWS CLI seed scripts) |

See `documentation/guides/FLOCI_INTEGRATION.md` for per-scenario labs.
