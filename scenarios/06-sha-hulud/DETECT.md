# Detection Runbook: Scenario 06 (Token-Theft and Re-Publishing Worm)

## IOCs

- Unexpected `postinstall` scripts in installed packages.
- File-system reads of `~/.npmrc`, `~/.git-credentials`, project `.npmrc`, and project `.env` during `npm install`.
- Local beacons to `127.0.0.1:3001` (credential harvester), `127.0.0.1:3003/publish` (mock registry), and `127.0.0.1:3002/backdoor-pr` (GitHub simulator).
- Evidence of a malicious publish for `victim-utils` or another victim-maintained package.
- Evidence of a backdoor PR opened against a victim repository.

## Sample Log Lines

```json
{
  "scenario_id": "06",
  "event_type": "token_harvest",
  "source": "shai-hulud",
  "destination": "127.0.0.1:3001",
  "npmToken": "npm_SCAS00...",
  "githubToken": "ghp_0000...",
  "timestamp_utc": "2026-09-25T12:00:00Z"
}
```

## Sigma (example)

```yaml
title: Token-Theft and Re-Publishing Worm Indicators
logsource:
  category: process_creation
detection:
  selection_token_theft:
    process.command_line|contains|all:
      - 'node'
      - 'postinstall'
      - '.npmrc'
  selection_republish:
    process.command_line|contains|all:
      - 'node'
      - 'postinstall'
      - '127.0.0.1:3003/publish'
  selection_backdoor_pr:
    process.command_line|contains|all:
      - 'node'
      - 'postinstall'
      - '127.0.0.1:3002/backdoor-pr'
  condition: 1 of selection_*
level: high
```

## YARA-like Text Rule (example)

```text
rule Shai_Hulud_Token_Theft_Indicator {
  strings:
    $a = ".git-credentials"
    $b = "_authToken"
    $c = "127.0.0.1:3001/collect"
    $d = "127.0.0.1:3003/publish"
    $e = "127.0.0.1:3002/backdoor-pr"
  condition:
    2 of them
}
```

## EDR/SIEM What To Expect

- A single `npm install` process that reads credential files and makes multiple localhost HTTP POSTs.
- Three mock-server processes running concurrently: credential harvester, mock registry, and GitHub simulator.
- Artifacts written to:
  - `infrastructure/captured-credentials.json`
  - `infrastructure/published-packages.json`
  - `infrastructure/backdoor-prs.json`

## Floci (optional cloud track)

- Unexpected `PutObject` under `s3://scas-sc06-artifacts/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 06`.

## Mitigation

- Store npm publish tokens only in CI/CD secrets; never keep them on developer machines.
- Run `npm ci --ignore-scripts` by default and allowlist only required lifecycle scripts.
- Require 2FA and publish provenance on npm maintainer accounts.
- Restrict GitHub personal access tokens to the smallest scope and shortest lifetime.
- Monitor CI and developer machines for unexpected `npm publish` or registry writes.
- Alert on postinstall scripts that read `~/.npmrc`, `~/.git-credentials`, or environment tokens.
- Rotate npm and GitHub tokens immediately after suspected compromise.

## Straightforward Implementation

### 1. Prevention config

Disable lifecycle scripts by default:

```ini
# .npmrc
ignore-scripts=true
```

Store the publish token in CI only:

```yaml
# .github/workflows/publish.yml
- run: npm publish --provenance --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_PUBLISH_TOKEN }}
```

### 2. CI gate

```yaml
# .github/workflows/install-gate.yml
- name: Install without lifecycle scripts
  run: npm ci --ignore-scripts
- name: Audit unexpected postinstall scripts
  run: node scripts/audit-lifecycle-scripts.js
```

### 3. Detection rule location

Deploy Sigma or SIEM rules for:

- `npm publish` or `npm login` from developer hosts.
- Postinstall scripts reading `~/.npmrc` or `~/.git-credentials`.
- Outbound traffic to unexpected registry or GitHub API endpoints during installs.

### 4. Incident response

```bash
# Revoke leaked tokens
npm token list
npm token revoke <token-id>
gh token list
gh token delete <token-id>

# Clean and reinstall without scripts
rm -rf node_modules package-lock.json
npm ci --ignore-scripts

# Audit published versions
npm view <package> versions --json
```
