# Detection Runbook: Scenario 15 (Developer Tool Compromise)

## IOCs
- Dev tool `postinstall` script with network calls.
- Install-time execution before app runtime.
- Beacon/capture activity to `127.0.0.1:3015`.

## Sample Log Lines
```json
{"scenario_id":"15","event_type":"dev_tool_postinstall_exec","source":"malicious-dev-tool","destination":"127.0.0.1:3015","timestamp_utc":"2026-04-20T13:10:00Z"}
```

## Sigma (example)
```yaml
title: Malicious Developer Tool Postinstall
detection:
  selection:
    process.command_line|contains: "npm install"
    process.command_line|contains: "malicious-dev-tool"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Dev_Tool_Compromise_IOC {
  strings:
    $a = "postinstall"
    $b = "malicious-dev-tool"
    $c = "3015"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Network/process events tied to dependency installation phase.
- Unexpected executable behavior from developer tooling package.
- Capture evidence in scenario infrastructure.

## Mitigation

- Enforce `--ignore-scripts` for untrusted tool installs by default.
- Pin dev tooling versions and source from an approved internal registry.
- Require review/allowlist for new lifecycle scripts in dependency diffs.
- Isolate tool installation to sandboxed CI runners with egress controls.
- Rotate credentials after any install-time compromise.

## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc15-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 15`.
