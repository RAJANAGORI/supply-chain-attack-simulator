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


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc17-artifacts/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 17`.

## Mitigation

- Add correlation rules that require cross-stage context before closing alerts.
- Segment credentials and permissions to block stage progression.
- Trigger automated containment when stage transitions occur in short windows.
- Preserve forensic artifacts per stage for post-incident timeline reconstruction.
- Run attack-chain tabletop exercises against your CI/CD architecture.

## Straightforward Implementation

### 1. Correlation rule (pseudo-Splunk)

```spl
| tstats `security` count from datamodel=Endpoint.Processes
  where Processes.process="npm install" by _time host
| join host [ search eventtype=network_traffic dest_port=443 ]
| where relative_time(_time,"-5m") < first_event_time
| where event_count >= 3
```

### 2. Segmentation

Use separate CI service accounts per stage. A build runner must not be able to publish packages or deploy to production.

### 3. Auto-containment

Configure SOAR or CI webhooks to kill runners and revoke tokens when stage transitions occur within a short window.

### 4. Tabletop exercises

Run quarterly attack-chain exercises against your CI/CD architecture. Preserve artifacts per stage for timeline reconstruction.
