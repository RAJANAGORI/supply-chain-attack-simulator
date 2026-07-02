# Scenario 23 + Floci (capstone cloud track)

Maps **CVE-2026-336334** mechanics to Floci: **ECR**, **CodePipeline**, **IAM/STS**, **CloudWatch Logs**, **S3 exfil**.

```bash
# repo root: ./scripts/floci-setup.sh --image && ./scripts/floci-up.sh && source .floci.env
export TESTBENCH_MODE=enabled SCAS_FLOCI_ENABLED=1
cd scenarios/23-trivy-supply-chain-attack
./infrastructure/floci/seed.sh
node infrastructure/mock-c2-server.js &
# run lab per README — malicious trivy-action-like.js harvests CI env
./infrastructure/floci/push-compromised.sh
./infrastructure/floci/verify.sh
../../detection-tools/floci/cloudtrail-hunt.sh 23
../../detection-tools/floci/s3-exfil-check.sh 23
```

Dual-write: mock C2 `:3023` + `s3://scas-sc23-artifacts/exfil/trivy-exfil-*.json`
