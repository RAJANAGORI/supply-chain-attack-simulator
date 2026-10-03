# Detection Runbook: Scenario 17 (Multi-Stage Attack Chain)

## IOCs
- Stage 1 indicator: dependency install followed by unexpected outbound beacon or file write.
- Stage 2 indicator: CI token or `.npmrc` secret read and exfiltrated.
- Stage 3 indicator: registry publish event using the stolen token.
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


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc17-artifacts/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 17`.

## Mitigation

- Correlate initial dependency access, lateral CI token abuse, and registry publish events before closing alerts.
- Segment CI service accounts so build runners cannot publish packages or deploy to production.
- Trigger auto-containment when dependency install, secret access, and publish events occur in short windows.
- Preserve per-stage forensic artifacts and run attack-chain tabletop exercises quarterly.
- Enforce least privilege on CI tokens and require approval gates for registry publishes.
- Maintain dependency allowlists and anomaly thresholds for first-seen packages or rapid version jumps.

## Straightforward Implementation

The full step-by-step implementation flow lives in the [scenario README](README.md#straightforward-implementation) to keep this runbook focused on detection.
