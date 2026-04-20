# Detection Runbook: Scenario 16 (Package Cache Poisoning)

## IOCs
- Repeated compromise after reinstall indicates cache persistence.
- Dependency source originates from poisoned cache path.
- Exfil/capture events on `127.0.0.1:3016`.

## Sample Log Lines
```json
{"scenario_id":"16","event_type":"cache_persistence_exec","source":"cached-package","destination":"127.0.0.1:3016","timestamp_utc":"2026-04-20T13:15:00Z"}
```

## Sigma (example)
```yaml
title: Persistent Package Compromise Across Reinstall
detection:
  selection:
    process.command_line|contains|all: ["npm", "install"]
    event.action: "repeat_compromise"
  condition: selection
level: medium
```

## YARA-like Text Rule (example)
```text
rule Cache_Poisoning_IOC {
  strings:
    $a = "cache"
    $b = "captured-data"
    $c = "3016"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Same malicious behavior after fresh `node_modules` removal.
- Evidence of cache artifact reuse.
- Detector findings from `cache-poisoning-detector.js`.
