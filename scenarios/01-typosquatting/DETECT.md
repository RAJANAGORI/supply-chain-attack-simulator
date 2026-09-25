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


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc01-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 01`.

## Mitigation

- Commit `package-lock.json` and use `npm ci` in production pipelines.
- Configure registry scope restrictions and verify package signatures where supported.
- Run automated dependency scanning (e.g. `npm audit`, Snyk, Socket.dev).
- Require a code-review checklist for every new dependency (name, maintainer, reputation).
- Prefer private registries and scope-based routing for internal package names.

## Straightforward Implementation

### 1. Prevention config

Create or update ".npmrc" in the repo root:

```ini
# .npmrc
@myorg:registry=https://internal.registry.example/
ignore-scripts=true
```

### 2. CI gate

```yaml
# .github/workflows/dependency-review.yml
name: Dependency Review
on: [pull_request]
jobs:
  dependency-review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - uses: actions/dependency-review-action@3b139cfc5fae8b618dfb3e11a0a753bf0c333854
        with:
          fail-on-severity: moderate
      - uses: socket-security/action@latest
        env:
          SOCKET_SECURITY_API_KEY: ${{ secrets.SOCKET_API_KEY }}
```

### 3. Pre-install verification

```bash
npm view <package> --json | jq '{name, version, maintainers, repository}'
npm pack <package>
tar -xzf <package>-*.tgz && cat package/index.js
```

### 4. Incident response

```bash
npm uninstall <typo-package>
npm token list
npm token revoke <token-id>
```
