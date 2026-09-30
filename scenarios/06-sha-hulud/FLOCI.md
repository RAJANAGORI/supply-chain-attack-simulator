# Scenario 06 + Floci

Extends the **token-theft and re-publishing worm** so harvested tokens are also mirrored to **Floci S3** (worm-style cloud persistence).

```bash
# repo root: ./scripts/floci/floci-setup.sh && ./scripts/floci/floci-up.sh && source .floci.env
export TESTBENCH_MODE=enabled SCAS_FLOCI_ENABLED=1
./infrastructure/floci/seed.sh
# Terminal A: node infrastructure/credential-harvester.js & node infrastructure/github-actions-simulator.js & node infrastructure/mock-registry.js &
# Terminal B: cd victim-app && npm install
# (seed/setup plants victim-app/.npmrc + .env and ~/.git-credentials with lookalike npm/GitHub tokens)
./infrastructure/floci/verify.sh
../../detection-tools/floci/s3-exfil-check.sh 06
../../detection-tools/floci/secrets-check.sh scas/sc06/decoy-npm-token
```

Dual-write: `:3001/collect` (mock) + `s3://scas-sc06-artifacts/exfil/harvested-credentials-*.json`

Lookalike decoys (LAB ONLY): Secrets Manager `scas/sc06/decoy-npm-token`, `decoy-github-pat`, `decoy-aws` - canonical values in `scenarios/_shared/lookalike-secrets.env`.
