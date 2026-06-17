# SCAS Floci orchestration

Local AWS emulator for cloud-track scenarios **05, 06, 14, 17, 21**.

## One-time setup

```bash
# From repo root — clones github.com/floci-io/floci → vendor/floci-aws and builds Docker image
./scripts/floci-setup.sh

# Fast path (no clone, no Java build — uses published image)
./scripts/floci-setup.sh --image
```

## Daily use

```bash
./scripts/floci-up.sh          # start scas-floci on :4566
source .floci.env              # SCAS_FLOCI_ENABLED=1 + AWS endpoint vars
./scripts/floci-status.sh      # health check
./scripts/floci-down.sh        # stop
```

## Layout

| Path | Purpose |
|------|---------|
| `vendor/floci-aws/` | Git clone of [floci-io/floci](https://github.com/floci-io/floci) (gitignored) |
| `docker-compose.yml` | Build from vendor |
| `docker-compose.image.yml` | Published `floci/floci:latest-compat` |
| `data/` | Persistent emulator state |
| `init/ready.d/` | Optional boot hooks (AWS CLI seed scripts) |

See `documentation/guides/FLOCI_INTEGRATION.md` for per-scenario labs.
