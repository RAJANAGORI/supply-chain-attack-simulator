# Detection Runbook: Scenario 13 (Package Metadata Manipulation)

## IOCs
- `homepage` or `repository` URL differs between registry API, tarball `package.json`, and known-good publisher.
- `author`/`maintainers` metadata differs between registry API and tarball.
- README presents a trusted homepage or project story that does not match the actual publisher.
- `dist.integrity` mismatch against expected values.
- Runtime capture events to `127.0.0.1:3001`.

## Sample Log Lines
```json
{"scenario_id":"13","event_type":"metadata_mismatch_execution","source":"clean-utils","destination":"127.0.0.1:3001","timestamp_utc":"2026-04-20T13:00:00Z"}
```

## Sigma (example)
```yaml
title: Package Metadata Integrity Mismatch
detection:
  selection:
    file.path|endswith: "package.json"
    file.content|contains|all: ["repository", "author", "dist"]
  condition: selection
level: medium
```

## YARA-like Text Rule (example)
```text
rule Metadata_Manipulation_IOC {
  strings:
    $a = "\"repository\""
    $b = "\"dist\""
    $c = "\"integrity\""
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Metadata anomalies before runtime execution.
- Detector output from `metadata-validator.js` indicating mismatches.
- Capture artifacts in `infrastructure/captured-data.json`.


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc13-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 13`.

## Mitigation

- Compare README, homepage, and repository URLs against a trusted source-of-truth; do not trust marketing copy.
- Validate registry API metadata against tarball `package.json`; reject mismatches in author, repository, homepage, or dist integrity.
- Pin exact versions and verify lockfile integrity hashes in CI.
- Maintain an internal mirror of approved artifacts with signed metadata.
- Require human review for dependency additions that change homepage, repository, or author fields.

## Straightforward Implementation

### 1. Metadata validation

```bash
# Registry API metadata
npm view clean-utils --json | jq '{name, version, author, repository, homepage, maintainers}'

# Tarball metadata
npm pack clean-utils
tar -xzf clean-utils-*.tgz
cat package/package.json | jq '{name, version, author, repository, homepage}'

# Compare the two; reject mismatches
```

### 2. CI gate

```yaml
# .github/workflows/metadata-check.yml
- run: npm ci --ignore-scripts
- run: node scripts/validate-package-metadata.js --allowlist allowed-packages.json
- run: node scripts/compare-registry-vs-tarball.js clean-utils
```

### 3. Allowlist maintenance

Store allowed package metadata in version control. Update only through pull request with security review.

### 4. SBOM comparison

Compare generated SBOM against the lockfile to detect omitted or altered dependencies.
