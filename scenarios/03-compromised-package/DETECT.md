# Detection Runbook: Scenario 03 (Compromised Package)

## IOCs
- Existing trusted package starts making outbound requests.
- New install/postinstall behavior introduced in patch update.
- Capture events to `127.0.0.1:3000`.

## Sample Log Lines
```json
{"scenario_id":"03","event_type":"compromised_pkg_runtime","source":"secure-validator","destination":"127.0.0.1:3000","timestamp_utc":"2026-04-20T12:10:00Z"}
```

## Sigma (example)
```yaml
title: Trusted Package Runtime Exfil Pattern
detection:
  selection:
    process.command_line|contains: "node index.js"
    network.destination.ip: "127.0.0.1"
    network.destination.port: 3000
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Compromised_Package_Runtime_IOC {
  strings:
    $a = "secure-validator"
    $b = "/captured-data"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Known package executing unexpected network-related code paths.
- Version drift aligned with behavior change.
- Mock server JSON evidence under `infrastructure/captured-data.json`.

## Mitigation

- Enforce lockfiles in CI (`npm ci --audit`) instead of open-ended `npm install`.
- Pin exact versions for packages with high trust or wide blast radius.
- Run automated security scanning on dependency updates (`npm audit`, custom scanners).
- Verify package integrity and signatures when the registry supports them.
- Monitor runtime behavior and log package installation events in production.
- Maintain maintainer-transfer and dependency-addition review policies.

## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc03-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 03`.
