# Detection Runbook: Scenario 13 (Package Metadata Manipulation)

## IOCs
- `repository`/`author` metadata differs from known-good publisher.
- `dist.integrity` mismatch against expected values.
- Runtime capture events to `127.0.0.1:3001`.

## Sample Log Lines
```json
{"scenario_id":"13","event_type":"metadata_mismatch_execution","source":"clean-utils","destination":"127.0.0.1:3001","timestamp_utc":"2026-04-20T13:00:00Z"}
```

## Sigma (example)
```yaml
title: Package Metadata Integrity Mismatch
detection:
  selection:
    file.path|endswith: "package.json"
    file.content|contains|all: ["repository", "author", "dist"]
  condition: selection
level: medium
```

## YARA-like Text Rule (example)
```text
rule Metadata_Manipulation_IOC {
  strings:
    $a = "\"repository\""
    $b = "\"dist\""
    $c = "\"integrity\""
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Metadata anomalies before runtime execution.
- Detector output from `metadata-validator.js` indicating mismatches.
- Capture artifacts in `infrastructure/captured-data.json`.
