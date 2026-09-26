# Detection Runbook: Scenario 05 (GitHub Actions Workflow Injection)

## IOCs

- Workflow references an action by a mutable tag (`@v1`, `@v2`) instead of a commit SHA.
- A build step receives `GITHUB_TOKEN` and multiple repository secrets via `env`.
- Action entrypoint reads `process.env` and makes an HTTP request during the build.
- Outbound network activity from a CI runner to an unexpected IP or domain.
- Force-push events on the action repository's protected tags.

## Sample Log Lines

```json
{
  "scenario_id": "05",
  "event_type": "ci_secret_exfil",
  "source": "vendor/build-action@v1",
  "attack_vector": "force-pushed-tag",
  "destination": "127.0.0.1:3000",
  "timestamp_utc": "2026-09-25T12:20:00Z",
  "ci_env": {
    "GITHUB_TOKEN": "[REDACTED-lab]",
    "AWS_ACCESS_KEY_ID": "AKIA...",
    "AWS_SECRET_ACCESS_KEY": "[REDACTED-lab]"
  }
}
```

## Sigma (example)

```yaml
title: GitHub Actions Step Secret Harvest and Egress
logsource:
  category: process_creation
  product: linux
detection:
  selection_secret:
    process.command_line|contains:
      - 'GITHUB_TOKEN'
      - 'AWS_SECRET_ACCESS_KEY'
      - 'DATABASE_PASSWORD'
  selection_egress:
    process.command_line|contains:
      - 'http.request'
      - 'https.request'
      - 'fetch('
  condition: selection_secret and selection_egress
level: high
```

## YARA-like Text Rule (example)

```text
rule Workflow_Injection_IOC {
  strings:
    $a = "TESTBENCH_MODE"
    $b = "127.0.0.1:3000"
    $c = "GITHUB_TOKEN"
    $d = "process.env"
  condition:
    ($a and $b) or ($c and $d)
}
```

## EDR/SIEM What To Expect

- CI job process tree showing a Node.js action reading environment variables and then opening an outbound socket.
- Build step logs that include a suspicious `process.env` enumeration.
- Mock server capture output containing redacted CI secrets and artifact metadata.
- GitHub audit log entries for force-pushes or tag updates on the action repository.

## Floci (optional cloud track)

When `SCAS_FLOCI_ENABLED=1` is set, the stolen secrets JSON is also mirrored to `s3://scas-sc05-artifacts/exfil/` and build artifacts are uploaded to `s3://scas-sc05-artifacts/releases/compromised/<timestamp>/`.

Seed the cloud evidence:

```bash
./infrastructure/floci/seed.sh
```

Verify:

```bash
./infrastructure/floci/verify.sh
../../detection-tools/floci/s3-exfil-check.sh 05
```

## Mitigation

- Pin every third-party action to an immutable commit SHA and verify it with an allowlist check.
- Set the minimum `permissions` on each workflow job and avoid granting `contents: write` when only read is needed.
- Do not pass repository secrets into third-party or reusable actions unless absolutely necessary; prefer OIDC and short-lived tokens.
- Protect reusable workflows and actions with branch rules, tag protection, CODEOWNERS, and signed tags.
- Monitor CI runner process trees and egress for unexpected secret access or outbound connections.
- Require security review of every workflow diff, especially new `uses` lines and mutable tag changes.
- Rotate CI secrets and revoke `GITHUB_TOKEN` after any suspected workflow injection incident.

## Straightforward Implementation

### 1. Prevention config

Replace mutable tags with SHA-pinned references and tighten permissions:

```yaml
# .github/workflows/build.yml
name: Build and publish
on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - uses: actions/setup-node@1e60f620b9541d16bece96c5465dc8ee9832be0b
        with:
          node-version: 20
      - run: npm ci --ignore-scripts
      - run: npm run build
      - uses: vendor/build-action@a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c
        with:
          artifact-path: dist/app.js
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 2. CI gate

Fail the build if a workflow uses a mutable tag:

```yaml
# .github/workflows/lint-actions.yml
name: Lint action references
on: [pull_request]
jobs:
  lint-actions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - name: Reject mutable action tags
        run: |
          grep -R "uses:.*@v[0-9]" .github/workflows/ && exit 1 || true
```

### 3. Detection rule location

Deploy the Sigma rule from DETECT.md to your SIEM under the supply-chain detection folder. Alert on:

- A CI step that reads `GITHUB_TOKEN` and then makes an outbound HTTP request
- `process.env` enumeration inside an action entrypoint
- New `uses` references or tag changes in workflow pull requests

### 4. Incident response

```bash
# 1. Stop current runs and remove the malicious action reference
gh workflow disable build.yml
# 2. Rotate all secrets the workflow could access
gh secret set AWS_ACCESS_KEY_ID --body "<new-key>"
gh secret set AWS_SECRET_ACCESS_KEY --body "<new-secret>"
# 3. Pin to the last known-good SHA
sed -i 's/vendor\/build-action@v1/vendor\/build-action@<clean-sha>/' .github/workflows/build.yml
# 4. Audit recent runs for unexpected egress or artifact changes
```
