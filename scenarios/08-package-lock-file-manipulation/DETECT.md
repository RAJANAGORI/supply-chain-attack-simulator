# Detection Runbook: Scenario 08 (Lockfile Manipulation)

## IOCs
- Lockfile diff introduces unexpected `resolved`/`integrity` source.
- Install output diverges from expected pinned artifact origin.
- Runtime events to `127.0.0.1:3000`.

## Sample Log Lines
```json
{"scenario_id":"08","event_type":"lockfile_source_drift","source":"package-lock.json","destination":"127.0.0.1:3000","timestamp_utc":"2026-04-20T12:35:00Z"}
```

## Sigma (example)
```yaml
title: Suspicious Lockfile Source Change
detection:
  selection:
    file.path|endswith: "package-lock.json"
    file.content|contains: "http://"
  condition: selection
level: medium
```

## YARA-like Text Rule (example)
```text
rule Lockfile_Manipulation_IOC {
  strings:
    $a = "\"resolved\""
    $b = "\"integrity\""
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Package install using altered lockfile metadata.
- Registry/source mismatch against approved policy.
- Captures available from mock endpoint/log file.
