# Detection Runbook: Scenario 14 (Container Image Supply Chain Attack)

## IOCs
- Entrypoint/CMD drift from baseline image (`malicious-start.js`).
- Startup network access pattern to `host.docker.internal:3002`.
- Static scanner findings on compromised Dockerfile.

## Sample Log Lines
```json
{"scenario_id":"14","event_type":"container_startup_beacon","source":"malicious-start.js","destination":"127.0.0.1:3002","timestamp_utc":"2026-04-20T13:05:00Z"}
```

## Sigma (example)
```yaml
title: Container Startup Script Unexpected Network Beacon
detection:
  selection:
    process.command_line|contains: "node malicious-start.js"
    network.destination.port: 3002
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Container_Image_Compromise_IOC {
  strings:
    $a = "malicious-start.js"
    $b = "host.docker.internal"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Container process tree includes non-baseline startup script.
- Immediate outbound request at container boot.
- Evidence in `infrastructure/captured-data.json`.
