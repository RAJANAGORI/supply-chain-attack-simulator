# Detection Runbook: Scenario 01 (Typosquatting)

## IOCs
- Unexpected package name close to a popular dependency (e.g., `request-lib` vs expected package).
- Install-time script execution from newly introduced package.
- Outbound localhost beacon to `127.0.0.1:3000`.

## Sample Log Lines
```json
{"scenario_id":"01","event_type":"install_beacon","source":"request-lib","destination":"127.0.0.1:3000","timestamp_utc":"2026-04-20T12:00:00Z"}
```

## Sigma (example)
```yaml
title: Suspicious npm Typosquat Install Script
detection:
  selection:
    process.command_line|contains|all: ["npm", "install"]
    process.command_line|contains: "request-lib"
  condition: selection
level: medium
```

## YARA-like Text Rule (example)
```text
rule Typosquat_Install_Script {
  strings:
    $a = "postinstall"
    $b = "127.0.0.1:3000"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Child process/network activity immediately after `npm install`.
- New dependency not present in approved baseline.
- Mock capture evidence at `infrastructure/captured-data.json`.

## Mitigation

- Commit `package-lock.json` and use `npm ci` in production pipelines.
- Configure registry scope restrictions and verify package signatures where supported.
- Run automated dependency scanning (e.g. `npm audit`, Snyk, Socket.dev).
- Require a code-review checklist for every new dependency (name, maintainer, reputation).
- Prefer private registries and scope-based routing for internal package names.

## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc01-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 01`.
