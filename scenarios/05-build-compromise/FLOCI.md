# Scenario 05 + Floci (optional cloud track)

Extend **Build System Compromise** with a local AWS emulator so learners see the same attack hit **real S3 APIs**, not only the HTTP mock on port 3000.

## Prerequisites

From **repo root** (one-time + each session):

```bash
./scripts/floci-setup.sh          # once: clone vendor/floci-aws + build
./scripts/floci-up.sh             # start scas-floci on :4566
source .testbench.env && source .floci.env
```

## Lab flow (Floci track)

### 1. Seed baseline artifact in S3

```bash
cd scenarios/05-build-compromise
chmod +x infrastructure/floci/*.sh
./infrastructure/floci/seed.sh
```

Creates bucket `scas-sc05-artifacts` with a legitimate `releases/legitimate/manifest.json`.

### 2. Run the normal lab (mock server still required)

```bash
node infrastructure/mock-server.js &
cd compromised-build
export AWS_ACCESS_KEY_ID=ci-key-leaked
export AWS_SECRET_ACCESS_KEY=ci-secret-leaked
export DATABASE_PASSWORD=super-secret-password
npm run build
```

**What changes with Floci enabled:**

| Step | Mock (port 3000) | Floci S3 |
|------|------------------|----------|
| Stolen env JSON | `POST /collect` | `s3://scas-sc05-artifacts/exfil/build-secrets-*.json` |
| Build output | local `dist/` | `s3://scas-sc05-artifacts/releases/compromised/<ts>/` |

### 3. Blue team — verify cloud evidence

```bash
./infrastructure/floci/verify.sh
# or
../../detection-tools/floci/s3-exfil-check.sh 05
```

### 4. Compare legitimate vs compromised in S3

```bash
source ../../scripts/floci-bridge.sh
scas_floci_aws s3 ls s3://scas-sc05-artifacts/releases/ --recursive
```

## Learning goals (Floci layer)

- Build pipelines with `AWS_*` in env are a **real exfil target** (CodeCov-style).
- HTTP beacons are not the only channel — **artifact buckets** get overwritten too.
- Detection: monitor S3 `PutObject` on release prefixes, not just outbound HTTP.

## Without Floci

Unset `SCAS_FLOCI_ENABLED`. The lab behaves exactly as before (smoke tests unchanged).

## Troubleshooting

### `PutObject` 500 / `upload failed` on `seed.sh`

1. **Floci running?** From repo root: `./scripts/floci-status.sh`
2. **Use emulator credentials for S3** (not lab leaked keys):
   ```bash
   source .floci.env
   SCAS_FLOCI_AWS_ACCESS_KEY_ID=test SCAS_FLOCI_AWS_SECRET_ACCESS_KEY=test \
     ./scenarios/05-build-compromise/infrastructure/floci/seed.sh
   ```
3. **Inspect Floci logs:** `docker logs scas-floci --tail 50`
4. **Reset storage** (repo root): `./scripts/floci-down.sh`, `rm -rf infrastructure/floci/data/*`, `./scripts/floci-up.sh`
5. **Hybrid storage needs Docker socket** — ensure the user running Floci can access `/var/run/docker.sock`.

### Build completes but nothing in S3 or mock server

You must see `[TESTBENCH] Simulating build-time data exfiltration...` during `npm run build`.

```bash
source /path/to/supply-chain-attack-simulator/.testbench.env
source /path/to/supply-chain-attack-simulator/.floci.env
export AWS_ACCESS_KEY_ID=ci-key-leaked      # fake leaked CI creds (JSON payload only)
export AWS_SECRET_ACCESS_KEY=ci-secret-leaked
export DATABASE_PASSWORD=super-secret-password
npm run build
```

Start `node infrastructure/mock-server.js` **before** `npm run build`.
