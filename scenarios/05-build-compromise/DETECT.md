# Detection Runbook: Scenario 05 (Build Compromise)

## IOCs
- Build pipeline step accesses env secrets unexpectedly.
- Build scripts initiate network activity to `127.0.0.1:3000`.
- Artifacts differ from expected deterministic build output.

## Sample Log Lines
```json
{"scenario_id":"05","event_type":"build_exfil","source":"npm run build","destination":"127.0.0.1:3000","timestamp_utc":"2026-04-20T12:20:00Z"}
```

## Sigma (example)
```yaml
title: Build Process Accessing Secret Variables
detection:
  selection:
    process.command_line|contains: "npm run build"
    process.command_line|contains: "AWS_SECRET_ACCESS_KEY"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Build_Compromise_IOC {
  strings:
    $a = "AWS_SECRET_ACCESS_KEY"
    $b = "127.0.0.1:3000"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- CI job process tree showing secret-material + network egress coupling.
- Build-step command line anomalies.
- Evidence in mock server capture output.
