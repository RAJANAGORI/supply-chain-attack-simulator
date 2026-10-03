# Detection Runbook: Scenario 24 (Slopsquatting)

## IOCs

- Package name `array-sortify` recommended by generated content but not present as an established public package.
- Install-time script execution from a package with no prior reputation.
- Outbound localhost beacon to `127.0.0.1:3024` immediately after `require('array-sortify')`.
- `package.json` dependency entry for `array-sortify`.

## Sample Log Lines

```json
{"scenario_id":"24","event_type":"install_beacon","source":"array-sortify","destination":"127.0.0.1:3024","attack_vector":"slopsquatting","timestamp_utc":"2026-09-25T09:00:00Z"}
```

## Sigma (example)

```yaml
title: Suspicious Slopsquat Package Install Beacon
detection:
  selection:
    process.command_line|contains|all:
      - "npm"
      - "install"
      - "array-sortify"
  condition: selection
level: medium
tags:
  - attack.supply-chain
  - attack.t1195.001
```

## YARA-like Text Rule (example)

```text
rule Slopsquat_array_sortify {
  strings:
    $a = "array-sortify"
    $b = "127.0.0.1:3024"
    $c = "TESTBENCH_MODE"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect

- Child process or network activity immediately after `npm install` of a newly introduced package.
- New dependency not present in the approved baseline.
- Outbound connection from a Node.js process to an external host (real incident) or to `127.0.0.1:3024` (lab).
- Mock capture evidence at `infrastructure/captured-data.json`.

## Floci (optional cloud track)

- Unexpected `PutObject` under `s3://scas-sc24-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `../../detection-tools/floci/s3-exfil-check.sh 24`.

## Mitigation

- Verify every package name on the public registry before installing a command copied from generated content.
- Prefer internal or scoped packages for reusable utility code.
- Run `npm install --ignore-scripts` and inspect package contents before allowing scripts.
- Maintain an approved-dependency allowlist and require security review for every new name.
- Pin exact versions and commit lockfiles so a slopsquat cannot slip in through a loose semver range.
- Scan dependency diffs for network requests, environment access, and eval-like patterns.

## Straightforward Implementation

The full step-by-step implementation flow lives in the [scenario README](README.md#straightforward-implementation) to keep this runbook focused on detection.
