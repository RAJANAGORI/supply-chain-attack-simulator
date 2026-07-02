# Scenario 19 + Floci

Optional **S3 mirror** plus **Glue/Athena/Config** analytics track for SBOM manipulation.

```bash
export TESTBENCH_MODE=enabled SCAS_FLOCI_ENABLED=1
./infrastructure/floci/seed.sh
# run lab — malicious SBOM generator omits malicious-lib
./infrastructure/floci/verify.sh
../../detection-tools/floci/s3-exfil-check.sh 19
```

Compare `s3://scas-sc19-artifacts/truth/dependencies.json` (ground truth) with generated `victim-app/sbom.json` and `s3://scas-sc19-artifacts/sbom/`.

Dual-write: mock `:3019` + `s3://scas-sc19-artifacts/exfil/sbom-exfil-*.json`
