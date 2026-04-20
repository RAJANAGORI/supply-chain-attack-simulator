# Detection Runbook: Scenario 06 (Shai-Hulud Self-Replication)

## IOCs
- Unexpected credential-harvesting behavior and replication markers.
- Local beacons/captures to `127.0.0.1:3001`.
- New files/scripts copied across project boundaries.

## Sample Log Lines
```json
{"scenario_id":"06","event_type":"credential_capture","source":"data-processor","destination":"127.0.0.1:3001","timestamp_utc":"2026-04-20T12:25:00Z"}
```

## Sigma (example)
```yaml
title: Suspicious Package Replication Pattern
detection:
  selection:
    process.command_line|contains|all: ["npm", "install", "data-processor"]
    file.path|contains: "captured-credentials"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Shai_Hulud_Replication_Indicator {
  strings:
    $a = "captured-credentials"
    $b = "mock-cdn"
  condition:
    any of them
}
```

## EDR/SIEM What To Expect
- Coupled file-system spread + network indicators.
- Multi-process behavior (harvester + CDN + victim app).
- Credential capture evidence in `infrastructure/captured-credentials.json`.
