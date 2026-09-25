# Detection Runbook: Scenario 20 (Package Version Confusion)

## IOCs
- Implausibly high resolved package version selected.
- Loose semver range enables attacker-controlled precedence.
- Runtime beacons to `127.0.0.1:3020`.

## Sample Log Lines
```json
{"scenario_id":"20","event_type":"version_confusion_resolution","source":"resolver","resolved_version":"999.0.0","destination":"127.0.0.1:3020","timestamp_utc":"2026-04-20T13:35:00Z"}
```

## Sigma (example)
```yaml
title: Suspicious High Version Resolution
detection:
  selection:
    event.type: "dependency_resolved"
    event.version|contains: "999"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Version_Confusion_IOC {
  strings:
    $a = "installed-version.json"
    $b = "999."
    $c = "3020"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Dependency resolution telemetry showing unusual version jumps.
- Detector findings from `version-confusion-detector.js`.
- Capture artifacts in scenario infrastructure.


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc20-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 20`.

## Mitigation

- Pin exact versions for critical dependencies and enforce lockfile usage.
- Scope private packages explicitly to internal registry endpoints.
- Alert on unusual semver jumps and first-seen maintainers.
- Require human review for dependency version changes above policy thresholds.
- Prefer deterministic `npm ci` workflows in CI.

## Straightforward Implementation

### 1. Dependabot config

```yaml
# .github/dependabot.yml
ignore:
  - dependency-name: "*"
    update-types: ["version-update:semver-major"]
```

### 2. Semver policy

Any dependency update that jumps more than one major version requires security review.

### 3. Scoped registry

```ini
# .npmrc
@myorg:registry=https://artifactory.example.com/api/npm/npm-internal/
```

### 4. CI gate

```yaml
- run: npm ci --ignore-scripts
- run: node scripts/check-version-jumps.js --threshold 2
```
