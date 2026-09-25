# Detection Runbook: Scenario 08 (Lockfile Manipulation)

## IOCs
- Lockfile diff introduces unexpected `resolved`/`integrity` source.
- Install output diverges from expected pinned artifact origin.
- Runtime events to `127.0.0.1:3000`.

## Sample Log Lines
```json
{"scenario_id":"08","event_type":"lockfile_source_drift","source":"package-lock.json","destination":"127.0.0.1:3000","timestamp_utc":"2026-04-20T12:35:00Z"}
```

## Sigma (example)
```yaml
title: Suspicious Lockfile Source Change
detection:
  selection:
    file.path|endswith: "package-lock.json"
    file.content|contains: "http://"
  condition: selection
level: medium
```

## YARA-like Text Rule (example)
```text
rule Lockfile_Manipulation_IOC {
  strings:
    $a = "\"resolved\""
    $b = "\"integrity\""
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Package install using altered lockfile metadata.
- Registry/source mismatch against approved policy.
- Captures available from mock endpoint/log file.


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc08-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 08`.

## Mitigation

- Validate lockfiles before install in CI and locally.
- Use git pre-commit hooks to detect unexpected lockfile changes.
- Require careful code review of every `package-lock.json` diff.
- Store and verify lockfile checksums as part of release gates.
- Compare `package.json` declared deps against lockfile entries automatically.
- Verify package integrity hashes match trusted registry metadata.

## Straightforward Implementation

### 1. Lockfile lint

```bash
npm install -g lockfile-lint
lockfile-lint --path package-lock.json   --allowed-hosts npm internal.registry.example   --allowed-schemes https:
```

### 2. CI gate

```yaml
# .github/workflows/lockfile-check.yml
- run: npm ci --ignore-scripts
- run: git diff --exit-code package-lock.json
- run: npx lockfile-lint --path package-lock.json --allowed-hosts npm
```

### 3. Pre-commit hook

```bash
# .git/hooks/pre-commit or husky
if git diff --cached --name-only | grep -q package-lock.json; then
  npx lockfile-lint --path package-lock.json --allowed-hosts npm
fi
```

### 4. Policy

Never allow "file:", "link:", or "git+ssh" dependencies in production lockfiles without explicit security review.
