# Scenario 06 + Floci

Extends **Shai-Hulud** so harvested credentials are also stored in **Floci S3** (worm-style cloud persistence).

```bash
# repo root: ./scripts/floci-setup.sh && ./scripts/floci-up.sh && source .floci.env
export TESTBENCH_MODE=enabled SCAS_FLOCI_ENABLED=1
./infrastructure/floci/seed.sh
# Terminal A: node infrastructure/mock-cdn.js & node infrastructure/credential-harvester.js
# Terminal B: cd victim-app && npm install ../compromised-package/data-processor
./infrastructure/floci/verify.sh
../../detection-tools/floci/s3-exfil-check.sh 06
```

Dual-write: `:3001/collect` (mock) + `s3://scas-sc06-artifacts/exfil/harvested-credentials-*.json`
