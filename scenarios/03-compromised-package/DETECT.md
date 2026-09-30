# Detection Runbook: Scenario 03 (Compromised Package)

## IOCs
- Existing trusted package starts making outbound requests.
- New install/postinstall behavior introduced in a patch update after a maintainer change.
- Patch-version release from a maintainer account with no recent activity or new 2FA status.
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


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc03-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 03`.

## Mitigation

- Require MFA and admin approval for maintainer role changes and publish tokens.
- Pin exact versions and enforce lockfile-only installs (`npm ci --ignore-scripts`) in CI.
- Alert on new maintainers, unexpected patch-version changes, and dependency additions in trusted packages.
- Run supply-chain scanners and diff reviews on every dependency update before merge.
- Segment CI permissions so a build job cannot publish packages or alter registry metadata.
- Maintain a known-good artifact mirror and rotate credentials after any suspected maintainer compromise.

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
# .github/workflows/supply-chain-scan.yml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
- name: Install dependencies without scripts
  run: npm ci --ignore-scripts
- name: Verify no unexpected patch drift
  run: node scripts/check-version-jumps.js --allow-patch-review secure-validator
- name: Supply-chain scan
  run: npx socket-dev scan
- name: Snyk test
  run: npx snyk test --severity-threshold=high
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### 3. Maintainer monitoring

```bash
# Alert on new maintainers or publish events
npm view secure-validator maintainers
npm owner ls secure-validator
```

### 4. Incident response

```bash
npm install <package>@<known-good-version> --save-exact
rm -rf node_modules package-lock.json
npm ci
npm token revoke <token-id>
# Rotate any CI or registry credentials the maintainer account could reach
```
