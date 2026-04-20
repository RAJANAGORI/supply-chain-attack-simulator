# Detection Runbook: Scenario 10 (Git Submodule Attack)

## IOCs
- Submodule URL/commit drift from approved baseline.
- Post-checkout/postinstall behavior from submodule path.
- Mock exfil events on `127.0.0.1:3000`.

## Sample Log Lines
```json
{"scenario_id":"10","event_type":"submodule_payload_exec","source":"malicious-submodule","destination":"127.0.0.1:3000","timestamp_utc":"2026-04-20T12:45:00Z"}
```

## Sigma (example)
```yaml
title: Suspicious Git Submodule Script Execution
detection:
  selection:
    process.command_line|contains|all: ["bash", "postinstall.sh"]
    process.command_line|contains: "submodule"
  condition: selection
level: medium
```

## YARA-like Text Rule (example)
```text
rule Submodule_Attack_IOC {
  strings:
    $a = ".gitmodules"
    $b = "postinstall.sh"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Git metadata change + script execution sequence.
- Submodule path running executable content during setup.
- Capture artifacts in scenario infrastructure.
