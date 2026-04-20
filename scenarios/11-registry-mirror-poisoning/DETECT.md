# Detection Runbook: Scenario 11 (Registry Mirror Poisoning)

## IOCs
- Mirror serves package metadata/hash differing from upstream baseline.
- Internal installs resolve to poisoned mirror content.
- Runtime/mock beacon events to `127.0.0.1:3000`.

## Sample Log Lines
```json
{"scenario_id":"11","event_type":"mirror_poison_execution","source":"internal_mirror","destination":"127.0.0.1:3000","timestamp_utc":"2026-04-20T12:50:00Z"}
```

## Sigma (example)
```yaml
title: Registry Mirror Drift Indicator
detection:
  selection:
    process.command_line|contains: "npm install"
    process.command_line|contains: "registry"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Registry_Mirror_Poisoning_IOC {
  strings:
    $a = "mirror"
    $b = "resolved"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Registry endpoint usage differs from approved sources.
- Hash/integrity mismatch between mirror and trusted origin.
- Local capture output in scenario infrastructure.
