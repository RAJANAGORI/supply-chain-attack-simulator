# Detection Runbook: Scenario 19 (SBOM Manipulation)

## IOCs
- `sbom.json` omits dependency present in lockfile/runtime truth data.
- SBOM generator output mismatches `truth/dependencies.json`.
- Capture events to `127.0.0.1:3019`.

## Sample Log Lines
```json
{"scenario_id":"19","event_type":"sbom_omission_detected","source":"sbom-generator","destination":"127.0.0.1:3019","timestamp_utc":"2026-04-20T13:30:00Z"}
```

## Sigma (example)
```yaml
title: SBOM and Lockfile Mismatch
detection:
  selection:
    file.path|endswith: "sbom.json"
    event.action: "dependency_missing"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule SBOM_Manipulation_IOC {
  strings:
    $a = "sbom.json"
    $b = "dependencies.json"
    $c = "malicious-lib"
  condition:
    any of them
}
```

## EDR/SIEM What To Expect
- Inventory mismatch alerts between generated SBOM and install graph.
- Validator findings from `sbom-manipulation-validator.js`.
- Evidence in mock capture and generated SBOM artifacts.
