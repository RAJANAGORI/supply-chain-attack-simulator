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

### 1. Prevention config

Create or update `.npmrc` in the repo root:

```ini
# .npmrc
@myorg:registry=https://internal.registry.example/
ignore-scripts=true
```

### 2. Pre-install verification

```bash
npm view array-sortify --json | jq '{name, version, maintainers, repository, time}'
npm pack array-sortify
tar -xzf array-sortify-*.tgz && cat package/index.js
```

### 3. CI gate

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

### 4. Incident response

```bash
npm uninstall array-sortify
rm -rf node_modules package-lock.json
npm ci
npm token list
npm token revoke <token-id>
```
