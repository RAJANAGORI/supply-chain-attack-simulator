# Detection Runbook: Scenario 18 (Package Manager Plugin Attack)

## IOCs
- Unapproved plugin hook enabled in project workflow.
- File injection/modification under dependency directories.
- Beacon activity to `127.0.0.1:3018`.

## Sample Log Lines
```json
{"scenario_id":"18","event_type":"plugin_hook_injection","source":"malicious-plugin","destination":"127.0.0.1:3018","timestamp_utc":"2026-04-20T13:25:00Z"}
```

## Sigma (example)
```yaml
title: Package Manager Plugin Hook Abuse
detection:
  selection:
    process.command_line|contains: "plugin"
    file.path|contains: "node_modules"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Plugin_Attack_IOC {
  strings:
    $a = "installHook"
    $b = "malicious-plugin"
    $c = "3018"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Install-time changes outside normal package manager behavior.
- Plugin execution preceding dependency tampering.
- Detector evidence from `plugin-attack-detector.js`.

## Mitigation

- Enforce plugin allowlists with signed/approved plugin sources.
- Block arbitrary plugin execution in CI and controlled developer images.
- Run integrity checks on `node_modules` and generated lockfile state.
- Review plugin code changes with the same rigor as build scripts.
- Alert on hook-driven modifications outside expected paths.

## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc18-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 18`.
