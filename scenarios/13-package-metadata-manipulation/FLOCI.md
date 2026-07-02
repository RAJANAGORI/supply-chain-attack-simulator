# Scenario 13 + Floci

Optional **S3 mirror** of mock-server exfil when `SCAS_FLOCI_ENABLED=1`.

```bash
# repo root: ./scripts/floci-setup.sh --image && ./scripts/floci-up.sh && source .floci.env
export TESTBENCH_MODE=enabled SCAS_FLOCI_ENABLED=1
cd scenarios/13-package-metadata-manipulation
./infrastructure/floci/seed.sh
# ... run normal README lab steps ...
./infrastructure/floci/verify.sh
../../detection-tools/floci/s3-exfil-check.sh 13
```

Dual-write: mock server (primary) + `s3://scas-sc13-artifacts/exfil/metadata-exfil-*.json`
