# Detection Runbook: Scenario 18 (Package Manager Hook Abuse - pnpm `.pnpmfile.cjs`)

## IOCs

- `.pnpmfile.cjs` exists in the project root and exports a `readPackage` hook.
- `readPackage` mutates `pkg.dependencies` at install time.
- `pnpm-lock.yaml` contains `malicious-logger` (or another injected package) not declared in `package.json`.
- `node_modules/malicious-logger/index.js` contains import-time exfiltration logic.
- Beacon activity to `127.0.0.1:3018` when the victim app imports the compromised dependency tree.

## Sample Log Lines

```json
{"scenario_id":"18","event_type":"pnpm_hook_import_time_exfil","source":"malicious-logger","destination":"127.0.0.1:3018","timestamp_utc":"2026-04-20T13:25:00Z"}
```

## Sigma (example)

```yaml
title: pnpm Hook File Dependency Injection
logsource:
  product: linux
  category: file_event
detection:
  selection_hook:
    file.path|endswith: '.pnpmfile.cjs'
  selection_lockfile_drift:
    file.path|endswith: 'pnpm-lock.yaml'
    process.command_line|contains: 'pnpm install'
  condition: selection_hook or selection_lockfile_drift
level: high
```

## YARA-like Text Rule (example)

```text
rule Pnpm_Hook_IOC {
  strings:
    $a = ".pnpmfile.cjs"
    $b = "readPackage"
    $c = "malicious-logger"
    $d = "127.0.0.1:3018"
  condition:
    ($a and $b) or ($c and $d)
}
```

## EDR/SIEM What To Expect

- Install-time file creation of `.pnpmfile.cjs` or unexpected modifications to `pnpm-lock.yaml`.
- Import-time network beacon from a package whose name does not appear in `package.json`.
- Detector evidence from `plugin-attack-detector.js` showing hook file and injected dependency.



## Floci (optional cloud track)

- Unexpected `PutObject` under `s3://scas-sc18-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 18`.

## Mitigation

- Treat `.pnpmfile.cjs` and `.yarn/plugins/*` as code requiring the same review as build scripts.
- Require CODEOWNERS approval for any hook file or plugin change.
- Run `pnpm install --frozen-lockfile` in CI and fail if the lockfile changes unexpectedly.
- Compare resolved dependencies against `package.json` declared dependencies in CI.
- Use isolated CI runners with restricted egress for install steps.
- Pin pnpm version and validate its checksum in CI.

## Straightforward Implementation

### 1. CODEOWNERS for hook files

```text
# .github/CODEOWNERS
.pnpmfile.cjs    @org/security-team
.yarn/plugins/*  @org/security-team
```

### 2. CI gate - fail on frozen lockfile changes

```yaml
# .github/workflows/ci.yml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
- name: Install with frozen lockfile
  run: npx pnpm install --frozen-lockfile
- name: Verify no unexpected lockfile changes
  run: git diff --exit-code pnpm-lock.yaml
```

### 3. Detect injected dependencies

```bash
npx pnpm list --json | jq '.dependencies | keys'
```

### 4. Isolate install in CI

```yaml
- name: Install in sandbox
  run: npx pnpm install --frozen-lockfile
  env:
    NODE_ENV: production
```
