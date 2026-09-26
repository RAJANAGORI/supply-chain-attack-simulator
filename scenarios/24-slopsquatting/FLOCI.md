# Scenario 24 + Floci

Optional **S3 mirror** of mock-server exfil when `SCAS_FLOCI_ENABLED=1`.

```bash
# repo root: ./scripts/floci/floci-setup.sh --image && ./scripts/floci/floci-up.sh && source .floci.env
export TESTBENCH_MODE=enabled SCAS_FLOCI_ENABLED=1
cd scenarios/24-slopsquatting
./infrastructure/floci/seed.sh
# ... run normal README lab steps ...
./infrastructure/floci/verify.sh
../../detection-tools/floci/s3-exfil-check.sh 24
```

Dual-write: mock server (primary) + `s3://scas-sc24-artifacts/exfil/install-beacon-*.json`
