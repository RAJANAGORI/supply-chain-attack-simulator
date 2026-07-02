# Scenario 11 + Floci

Optional **S3 mirror** of mock-server exfil when `SCAS_FLOCI_ENABLED=1`.

```bash
# repo root: ./scripts/floci-setup.sh --image && ./scripts/floci-up.sh && source .floci.env
export TESTBENCH_MODE=enabled SCAS_FLOCI_ENABLED=1
cd scenarios/11-registry-mirror-poisoning
./infrastructure/floci/seed.sh
# ... run normal README lab steps ...
./infrastructure/floci/verify.sh
../../detection-tools/floci/s3-exfil-check.sh 11
```

Dual-write: mock server (primary) + `s3://scas-sc11-artifacts/exfil/mirror-exfil-*.json`

Extended seed also creates **ECR** repo `scas-sc11-app` as an enterprise container-registry analog.

