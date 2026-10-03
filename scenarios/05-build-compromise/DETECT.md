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

The full step-by-step implementation flow lives in the [scenario README](README.md#straightforward-implementation) to keep this runbook focused on detection.
