# Detection Runbook: Scenario 15 (Developer Tool Compromise)

## IOCs
- Dev tool `postinstall` script with network calls.
- Install-time execution before app runtime.
- Beacon/capture activity to `127.0.0.1:3015`.

## Sample Log Lines
```json
{"scenario_id":"15","event_type":"dev_tool_postinstall_exec","source":"malicious-dev-tool","destination":"127.0.0.1:3015","timestamp_utc":"2026-04-20T13:10:00Z"}
```

## Sigma (example)
```yaml
title: Malicious Developer Tool Postinstall
detection:
  selection:
    process.command_line|contains: "npm install"
    process.command_line|contains: "malicious-dev-tool"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Dev_Tool_Compromise_IOC {
  strings:
    $a = "postinstall"
    $b = "malicious-dev-tool"
    $c = "3015"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Network/process events tied to dependency installation phase.
- Unexpected executable behavior from developer tooling package.
- Capture evidence in scenario infrastructure.
