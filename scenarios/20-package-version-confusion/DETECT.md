# Detection Runbook: Scenario 20 (Package Version Confusion)

## IOCs
- Implausibly high resolved package version selected.
- Loose semver range enables attacker-controlled precedence.
- Runtime beacons to `127.0.0.1:3020`.

## Sample Log Lines
```json
{"scenario_id":"20","event_type":"version_confusion_resolution","source":"resolver","resolved_version":"999.0.0","destination":"127.0.0.1:3020","timestamp_utc":"2026-04-20T13:35:00Z"}
```

## Sigma (example)
```yaml
title: Suspicious High Version Resolution
detection:
  selection:
    event.type: "dependency_resolved"
    event.version|contains: "999"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Version_Confusion_IOC {
  strings:
    $a = "installed-version.json"
    $b = "999."
    $c = "3020"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Dependency resolution telemetry showing unusual version jumps.
- Detector findings from `version-confusion-detector.js`.
- Capture artifacts in scenario infrastructure.
