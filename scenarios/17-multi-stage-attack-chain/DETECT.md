# Detection Runbook: Scenario 17 (Multi-Stage Attack Chain)

## IOCs
- Ordered stage indicators (`stage1` -> `stage2` -> `stage3`).
- Correlated events in short time window from same host/run context.
- Capture events to `127.0.0.1:3017`.

## Sample Log Lines
```json
{"scenario_id":"17","event_type":"stage_transition","source":"stage2-compromised-lib","destination":"127.0.0.1:3017","timestamp_utc":"2026-04-20T13:20:00Z"}
```

## Sigma (example)
```yaml
title: Multi-Stage Supply Chain Correlation
detection:
  selection1:
    event.type: "stage1"
  selection2:
    event.type: "stage2"
  selection3:
    event.type: "stage3"
  condition: selection1 and selection2 and selection3
level: high
```

## YARA-like Text Rule (example)
```text
rule Multi_Stage_Attack_IOC {
  strings:
    $a = "stage1"
    $b = "stage2"
    $c = "stage3"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Individual low-signal alerts combine into high-confidence chain.
- Correlator output from `multi-stage-correlator.js`.
- Timeline evidence in `infrastructure/captured-data.json`.
