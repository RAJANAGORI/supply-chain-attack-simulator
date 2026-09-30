# Detection Runbook: Scenario 25 (Compromised Reusable GitHub Action)

## IOCs

- Workflow references `example/actions/checkout@v3` (mutable tag, force-pushed to malicious commit).
- Any third-party action reference using a mutable tag (`@vN` or `@vN.N.N`) instead of a commit SHA.
- Unexpected POST beacon to `127.0.0.1:3025` (lab) or an external host (real incident).
- IOC marker file `infrastructure/captured-data.json` containing CI credential fields.

## Sample Log Lines

```json
{"scenario_id":"25","event_type":"ci_secret_exfil","source":"example/actions/checkout@v3","destination":"127.0.0.1:3025","attack_vector":"force-pushed-tag","timestamp_utc":"2026-09-25T09:00:00Z"}
```

## Sigma (example)

```yaml
title: Compromised Reusable Action CI Exfil Beacon
detection:
  selection:
    process.command_line|contains: "checkout"
    network.destination.ip: "127.0.0.1"
    network.destination.port: 3025
  condition: selection
level: critical
tags:
  - attack.exfiltration
  - attack.t1567
  - attack.supply-chain
```

## YARA-like Text Rule (example)

```text
rule Compromised_Checkout_Action_IOC {
  strings:
    $a = "example/actions/checkout@v3"
    $b = "127.0.0.1:3025"
    $c = "TESTBENCH_MODE"
  condition:
    any of them
}
```

## EDR/SIEM What To Expect

- HTTP POST from a CI runner process to an external host immediately after the checkout step begins.
- Network connection from the action runner to an unexpected destination.
- GitHub audit log events showing a force-push or tag update on the action repository.
- CI pipeline logs show the checkout step completing normally (infostealer preserves legitimate output).
- In the lab: capture evidence at `infrastructure/captured-data.json` with `ci_secret_exfil` event type.

## Floci (optional cloud track)

- Unexpected `PutObject` under `s3://scas-sc25-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `../../detection-tools/floci/s3-exfil-check.sh 25`.

## Mitigation

- Pin every reusable action to an immutable commit SHA, never a mutable tag.
- Audit workflow files for tag references and enforce SHA pinning via CI lint or policy.
- Apply least-privilege permissions and avoid passing secrets to third-party actions as environment variables.
- Monitor CI runners for unexpected outbound network calls.
- Rotate CI secrets immediately when a reusable action compromise is reported or suspected.
- Use tools like `step-security/harden-runner` to block unexpected egress from action steps.

## Straightforward Implementation

### 1. Pin actions by SHA

```yaml
# .github/workflows/ci.yml
- name: Checkout
  uses: example/actions/checkout@a1b2c3d4e5f6789012345678901234567890abcd
```

### 2. Audit workflow files

```bash
grep -R "uses:.*@v" .github/workflows/ && exit 1
```

### 3. Harden runner

```yaml
- uses: step-security/harden-runner@<full-sha>
  with:
    egress-policy: block
    allowed-endpoints: |
      github.com:443
      registry.npmjs.org:443
```

### 4. Credential rotation

```bash
# Rotate all secrets accessible to affected pipeline runs
gh secret set GITHUB_TOKEN --repo org/repo --body "..."
aws iam create-access-key --user-name ci-user
# Update any database, registry, or cloud credentials the action could reach
```
