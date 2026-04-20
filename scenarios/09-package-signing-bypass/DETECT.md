# Detection Runbook: Scenario 09 (Package Signing Bypass)

## IOCs
- Package accepted despite missing/invalid signature metadata.
- Signature verification step skipped or silently bypassed.
- Runtime callbacks to `127.0.0.1:3000`.

## Sample Log Lines
```json
{"scenario_id":"09","event_type":"signature_bypass_exec","source":"package_verifier","destination":"127.0.0.1:3000","timestamp_utc":"2026-04-20T12:40:00Z"}
```

## Sigma (example)
```yaml
title: Package Verification Bypass Pattern
detection:
  selection:
    process.command_line|contains: "verify"
    process.command_line|contains: "bypass"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Signing_Bypass_Indicator {
  strings:
    $a = "signature"
    $b = "bypass"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Verification logs inconsistent with package acceptance decision.
- Install/run behavior from unsigned or invalidly signed artifact.
- Capture records in infrastructure data file.
