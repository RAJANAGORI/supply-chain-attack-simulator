# Detection Runbook: Scenario 04 (Malicious Update)

## IOCs
- Dependency update introduces install/runtime script behavior not seen previously.
- Lockfile/package diff shows suspicious new transitive path.
- Beacon events to `127.0.0.1:3000`.

## Sample Log Lines
```json
{"scenario_id":"04","event_type":"malicious_update_exec","source":"utils-helper","destination":"127.0.0.1:3000","timestamp_utc":"2026-04-20T12:15:00Z"}
```

## Sigma (example)
```yaml
title: Dependency Update With New Script Execution
detection:
  selection:
    process.command_line|contains|all: ["npm", "install"]
    process.command_line|contains: "utils-helper"
  condition: selection
level: medium
```

## YARA-like Text Rule (example)
```text
rule Malicious_Update_Script {
  strings:
    $a = "postinstall"
    $b = "utils-helper"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Update event closely followed by new outbound behavior.
- Script execution telemetry around dependency installation.
- Captures stored in scenario mock server artifacts.

## Mitigation

- Pin exact versions in `package.json` — avoid carets on sensitive dependencies.
- Commit lockfiles and use `npm ci` in CI/CD pipelines.
- Verify updates before install (changelog review, integrity checks, code diff).
- Scan dependency updates automatically in CI before merge.
- Use staged rollouts — test updates in staging before production.
- Require human review of changelogs for patch and minor bumps on critical packages.

## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc04-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 04`.
