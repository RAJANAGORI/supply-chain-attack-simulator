# Detection Runbook: Scenario 18 (Package Manager Plugin Attack)

## IOCs
- Unapproved plugin hook enabled in project workflow.
- File injection/modification under dependency directories.
- Beacon activity to `127.0.0.1:3018`.

## Sample Log Lines
```json
{"scenario_id":"18","event_type":"plugin_hook_injection","source":"malicious-plugin","destination":"127.0.0.1:3018","timestamp_utc":"2026-04-20T13:25:00Z"}
```

## Sigma (example)
```yaml
title: Package Manager Plugin Hook Abuse
detection:
  selection:
    process.command_line|contains: "plugin"
    file.path|contains: "node_modules"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Plugin_Attack_IOC {
  strings:
    $a = "installHook"
    $b = "malicious-plugin"
    $c = "3018"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Install-time changes outside normal package manager behavior.
- Plugin execution preceding dependency tampering.
- Detector evidence from `plugin-attack-detector.js`.


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc18-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 18`.

## Mitigation

- Enforce plugin allowlists with signed/approved plugin sources.
- Block arbitrary plugin execution in CI and controlled developer images.
- Run integrity checks on `node_modules` and generated lockfile state.
- Review plugin code changes with the same rigor as build scripts.
- Alert on hook-driven modifications outside expected paths.

## Straightforward Implementation

### 1. Plugin allowlist

```yaml
# allowed-plugins.yml
allowed:
  - @yarnpkg/plugin-typescript
  - @pnpm/plugin-engines
```

### 2. CI gate

```yaml
# .github/workflows/plugin-check.yml
- run: |
    ls .yarn/plugins .pnpmfile.cjs 2>/dev/null || true
    node scripts/validate-plugins-against-allowlist.js
```

### 3. Integrity check

```bash
# Compare node_modules state against lockfile
npm ci --ignore-scripts
npm ls
```

### 4. Review policy

Review plugin code changes with the same rigor as build scripts. Alert on hook-driven file changes outside expected paths.
