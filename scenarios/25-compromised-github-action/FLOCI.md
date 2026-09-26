# Scenario 25 + Floci

Optional **S3 mirror** of mock-server exfil when `SCAS_FLOCI_ENABLED=1`.

```bash
# repo root: ./scripts/floci/floci-setup.sh --image && ./scripts/floci/floci-up.sh && source .floci.env
export TESTBENCH_MODE=enabled SCAS_FLOCI_ENABLED=1
cd scenarios/25-compromised-github-action
./infrastructure/floci/seed.sh
node infrastructure/mock-server.js &
set -a && source .env.ci-lab && set +a
# run lab per README - malicious checkout action harvests CI env
./run-ci.sh
./infrastructure/floci/verify.sh
../../detection-tools/floci/s3-exfil-check.sh 25
```

Dual-write: mock server `:3025` + `s3://scas-sc25-artifacts/exfil/ci-secret-exfil-*.json`
