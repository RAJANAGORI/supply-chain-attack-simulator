# Detection Runbook: Scenario 05 (Build Compromise)

## IOCs
- Build pipeline step accesses env secrets unexpectedly.
- Build scripts initiate network activity to `127.0.0.1:3000`.
- Artifacts differ from expected deterministic build output.

## Sample Log Lines
```json
{"scenario_id":"05","event_type":"build_exfil","source":"npm run build","destination":"127.0.0.1:3000","timestamp_utc":"2026-04-20T12:20:00Z"}
```

## Sigma (example)
```yaml
title: Build Process Accessing Secret Variables
detection:
  selection:
    process.command_line|contains: "npm run build"
    process.command_line|contains: "AWS_SECRET_ACCESS_KEY"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Build_Compromise_IOC {
  strings:
    $a = "AWS_SECRET_ACCESS_KEY"
    $b = "127.0.0.1:3000"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- CI job process tree showing secret-material + network egress coupling.
- Build-step command line anomalies.
- Evidence in mock server capture output.


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc05-artifacts/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 05`.

## Mitigation

- Verify build script integrity with checksums before each build.
- Apply least privilege to CI/CD jobs and secret exposure.
- Run builds in isolated environments with minimal credentials.
- Verify build artifacts with checksums and signed attestations.
- Use secret management tools - never hardcode secrets in build scripts.
- Audit and log all build activities for forensic review.
- Sign release artifacts and verify signatures before deployment.

## Straightforward Implementation

### 1. CI gate (OIDC, no long-lived secrets)

```yaml
# .github/workflows/build.yml
permissions:
  id-token: write
  contents: read
steps:
  - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
  - uses: aws-actions/configure-aws-credentials@e3dd6a429a730001a79de495f50a554053c04fbc
    with:
      role-to-assume: arn:aws:iam::ACCOUNT:role/build-role
  - run: npm ci --ignore-scripts
  - run: npm run build
```

### 2. Artifact signing

```bash
cosign sign-blob --yes artifact.tgz --output-signature artifact.tgz.sig
```

### 3. SLSA provenance

```yaml
# Reusable workflow reference
uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v2.0.0
```

### 4. Build isolation

Use ephemeral CI runners or containers. Never reuse a runner that has built a different repository without re-imaging.
