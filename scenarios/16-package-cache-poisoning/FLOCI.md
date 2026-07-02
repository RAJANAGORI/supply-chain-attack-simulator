# Scenario 16 + Floci

Optional **S3 mirror** of mock-server exfil when `SCAS_FLOCI_ENABLED=1`.

```bash
# repo root: ./scripts/floci-setup.sh --image && ./scripts/floci-up.sh && source .floci.env
export TESTBENCH_MODE=enabled SCAS_FLOCI_ENABLED=1
cd scenarios/16-package-cache-poisoning
./infrastructure/floci/seed.sh
# ... run normal README lab steps ...
./infrastructure/floci/verify.sh
../../detection-tools/floci/s3-exfil-check.sh 16
```

Dual-write: mock server (primary) + `s3://scas-sc16-artifacts/exfil/cache-exfil-*.json`
