# Detection Runbook: Scenario 07 (Transitive Dependency Attack)

## IOCs
- Malicious behavior from dependency not directly listed in root dependencies.
- Postinstall execution inside nested `node_modules` package.
- Beacon activity to `127.0.0.1:3000`.

## Sample Log Lines
```json
{"scenario_id":"07","event_type":"transitive_postinstall_exec","source":"data-processor","destination":"127.0.0.1:3000","timestamp_utc":"2026-04-20T12:30:00Z"}
```

## Sigma (example)
```yaml
title: Transitive Package Install Script Execution
detection:
  selection:
    process.command_line|contains: "postinstall.js"
    process.command_line|contains: "node_modules"
  condition: selection
level: medium
```

## YARA-like Text Rule (example)
```text
rule Transitive_Dependency_IOC {
  strings:
    $a = "node_modules/data-processor"
    $b = "postinstall.js"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Child process execution from nested dependency path.
- Root app behavior change despite no direct dependency update.
- Capture evidence in scenario infrastructure output.

## Mitigation

- Pin exact dependency versions — avoid loose semver ranges on critical packages.
- Commit `package-lock.json` and use `npm ci` in CI/CD.
- Run automated scanning (`npm audit`, SBOM tools) across the full dependency tree.
- Generate and maintain SBOMs for transitive dependency visibility.
- Monitor postinstall script execution and unexpected network requests.
- Review the full dependency tree regularly, not only direct dependencies.

## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc07-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 07`.
