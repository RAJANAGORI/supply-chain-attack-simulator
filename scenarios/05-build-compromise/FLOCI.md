# Scenario 05 + Floci (optional cloud track)

This track adds a local AWS emulator so the workflow injection lab writes evidence to real S3 APIs instead of only the HTTP mock on port 3000.

## Prerequisites

From the repo root (one-time + each session):

```bash
./scripts/floci/floci-setup.sh          # once: clone vendor/floci-aws + build
./scripts/floci/floci-up.sh             # start scas-floci on :4566
source .testbench.env && source .floci.env
```

## Lab flow

### 1. Seed baseline artifact in S3

```bash
cd scenarios/05-build-compromise
chmod +x infrastructure/floci/*.sh
./infrastructure/floci/seed.sh
```

Creates bucket `scas-sc05-artifacts` with a baseline `releases/legitimate/manifest.json`, plus IAM role `scas-sc05-codebuild-role` and SSM parameter `/scas/sc05/ci-database-url` for the CI abuse narrative.

### 2. Run the normal lab (mock server still required)

```bash
node infrastructure/mock-server.js &
# Lookalike CI secrets (LAB ONLY) - same values seeded into Floci SM/SSM
./run-ci.sh
```

What changes with Floci enabled:

| Step | Mock (port 3000) | Floci (S3 + IAM/STS + Logs) |
|------|------------------|---------------------------|
| Stolen env JSON | `POST /collect` | `s3://scas-sc05-artifacts/exfil/build-secrets-*.json` |
| Build output | local `dist/` | `s3://scas-sc05-artifacts/releases/compromised/<ts>/` |
| CI identity abuse | - | STS `GetCallerIdentity` + CloudWatch Logs `/scas/sc05/build` |

### 3. Blue team - verify cloud evidence

```bash
./infrastructure/floci/verify.sh
../../detection-tools/floci/s3-exfil-check.sh 05
../../detection-tools/floci/cloudtrail-hunt.sh 05
```

### 4. Compare baseline vs compromised in S3

```bash
source ../../scripts/floci/floci-bridge.sh
scas_floci_aws s3 ls s3://scas-sc05-artifacts/releases/ --recursive
```

## Learning goals

- CI pipelines with `AWS_*` in env are a real exfil target, similar to CodeCov.
- HTTP beacons are not the only channel - artifact buckets can also be overwritten.
- Detection should monitor S3 `PutObject` on release prefixes, not just outbound HTTP.

## Without Floci

Unset `SCAS_FLOCI_ENABLED`. The lab behaves exactly as before and smoke tests stay unchanged.

## Troubleshooting

### `PutObject` 500 / `upload failed` on `seed.sh`

Full reset:

```bash
cd ~/supply-chain-attack-simulator
./scripts/floci/floci-down.sh
rm -rf infrastructure/floci/data/*
# Use memory storage (avoid hybrid 500 on Linux/aarch64)
grep -q FLOCI_STORAGE_MODE infrastructure/floci/.env \
  && sed -i 's/^FLOCI_STORAGE_MODE=.*/FLOCI_STORAGE_MODE=memory/' infrastructure/floci/.env \
  || echo 'FLOCI_STORAGE_MODE=memory' >> infrastructure/floci/.env
./scripts/floci/floci-up.sh
source .floci.env
./scripts/floci/floci-status.sh    # Init must show "ready"
cd scenarios/05-build-compromise
./infrastructure/floci/seed.sh
```

1. Floci init ready? `./scripts/floci/floci-status.sh` must show `Init: ready`
2. Use emulator credentials: `source .floci.env` from repo root (do not rely on host `~/.aws/credentials`)
3. Inspect logs: `docker logs scas-floci --tail 80`
4. Manual upload test (inside container):
   ```bash
   docker exec scas-floci aws --endpoint-url http://127.0.0.1:4566 s3 mb s3://scas-sc05-artifacts
   docker cp scenarios/05-build-compromise/victim-app/dist/manifest.json scas-floci:/tmp/m.json
   docker exec scas-floci aws --endpoint-url http://127.0.0.1:4566 s3 cp /tmp/m.json s3://scas-sc05-artifacts/releases/legitimate/manifest.json
   ```

### Pipeline completes but nothing in S3 or mock server

You should see `[TESTBENCH] build-action: simulating CI secret and artifact harvest...` during `./run-ci.sh`.

```bash
source /path/to/supply-chain-attack-simulator/.testbench.env
source /path/to/supply-chain-attack-simulator/.floci.env
# Lookalike CI secrets for JSON harvest only - do not overwrite Floci emulator keys after this
set -a && source .env.lab 2>/dev/null || source ../../_shared/lookalike-secrets.env; set +a
./run-ci.sh
```

Start `node infrastructure/mock-server.js` before `./run-ci.sh`.
