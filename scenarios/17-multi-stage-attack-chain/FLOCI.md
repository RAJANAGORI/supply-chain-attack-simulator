# Scenario 17 + Floci

Each attack stage writes a marker to **S3** for cloud-side kill-chain correlation.

```bash
# repo root: ./scripts/floci-setup.sh && ./scripts/floci-up.sh && source .floci.env
export TESTBENCH_MODE=enabled SCAS_FLOCI_ENABLED=1
./infrastructure/floci/seed.sh
node infrastructure/mock-server.js &
cd victim-app && npm install ../packages/stage1-access-lib ../packages/stage2-compromised-lib && npm start
./infrastructure/floci/verify.sh
```

Compare `infrastructure/captured-data.json` (mock) with `s3://scas-sc17-artifacts/chain/*/`.

Extended seed registers **Step Functions** `scas-sc17-chain` and an **EventBridge** correlation event. Verify with `eventbridge-chain-check.sh`.
