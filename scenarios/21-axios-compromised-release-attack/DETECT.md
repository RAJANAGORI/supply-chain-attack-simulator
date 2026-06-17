# Detection Runbook: Scenario 21 (Axios-style Compromised Release)

## IOCs
- Unexpected transitive dependency (`plain-crypto-js-like`) introduced by patch upgrade.
- `postinstall` execution + IOC marker file `.testbench-axios-ioc.json`.
- Beacon/capture traffic to `127.0.0.1:3021`.

## Sample Log Lines
```json
{"scenario_id":"21","event_type":"transitive_postinstall_beacon","source":"plain-crypto-js-like","destination":"127.0.0.1:3021","timestamp_utc":"2026-04-20T13:40:00Z"}
```

## Sigma (example)
```yaml
title: Unexpected Transitive Postinstall During Patch Upgrade
detection:
  selection:
    process.command_line|contains|all: ["npm", "install", "axios-like-1.14.1.tgz"]
    file.path|contains: ".testbench-axios-ioc.json"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Axios_Compromise_IOC {
  strings:
    $a = "plain-crypto-js-like"
    $b = ".testbench-axios-ioc.json"
    $c = "3021"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Install-time process/network activity without direct app import of transitive package.
- Lockfile/package tree IOC for unexpected bundled dependency.
- Evidence in mock server capture and marker file.

## Mitigation

- Contain: stop CI runners and isolate hosts that installed the bad version.
- Eradicate: remove `node_modules`, regenerate lockfiles, rotate npm tokens and CI secrets.
- Recover: pin to a known-good exact version; enforce lockfile-only installs in CI.
- Hunt: search org lockfiles for unexpected transitive packages from advisories.
- Enable trusted publishing / provenance checks and lifecycle script monitoring.
