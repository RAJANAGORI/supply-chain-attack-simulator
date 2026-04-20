# Detection Runbook: Scenario 02 (Dependency Confusion)

## IOCs
- Scoped/internal package resolved from unexpected source.
- Installed version unexpectedly higher than approved private version.
- Local beacon activity to `127.0.0.1:3000` during run/install.

## Sample Log Lines
```json
{"scenario_id":"02","event_type":"dependency_confusion_exec","source":"@techcorp/auth-lib","resolved_version":"999.0.0","destination":"127.0.0.1:3000","timestamp_utc":"2026-04-20T12:05:00Z"}
```

## Sigma (example)
```yaml
title: Scoped Package Resolved With Suspicious Version
detection:
  selection:
    process.command_line|contains|all: ["npm", "install", "@techcorp/auth-lib"]
    process.command_line|contains: "999"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Dependency_Confusion_Indicator {
  strings:
    $a = "@techcorp/auth-lib"
    $b = "127.0.0.1:3000"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Resolver behavior inconsistent with scoped registry policy.
- Install/run-time network events after package resolution.
- Missing or weak `.npmrc` scope mapping in project context.
