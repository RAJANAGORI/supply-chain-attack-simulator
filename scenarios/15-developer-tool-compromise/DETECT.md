# Detection Runbook: Scenario 15 (Developer Tool Compromise)

## IOCs
- Dev tool `postinstall` script with network calls.
- Install-time execution before app runtime.
- Lockfile drift or unexpected `.gitignore` entries created during install.
- Beacon/capture activity to `127.0.0.1:3015`.

## Sample Log Lines
```json
{"scenario_id":"15","event_type":"dev_tool_postinstall_exec","source":"malicious-dev-tool","destination":"127.0.0.1:3015","timestamp_utc":"2026-04-20T13:10:00Z"}
```

## Sigma (example)
```yaml
title: Malicious Developer Tool Postinstall
detection:
  selection:
    process.command_line|contains: "npm install"
    process.command_line|contains: "malicious-dev-tool"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule Dev_Tool_Compromise_IOC {
  strings:
    $a = "postinstall"
    $b = "malicious-dev-tool"
    $c = "3015"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Network/process events tied to dependency installation phase.
- Unexpected executable behavior from developer tooling package.
- Capture evidence in scenario infrastructure.


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc15-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 15`.

## Mitigation

- Install dev tools with `--ignore-scripts` by default and source only from approved registries.
- Review lockfile and `.gitignore` diffs for hidden entries after any tool install or update.
- Pin dev tool versions and verify checksums before distribution to developers.
- Run tool installs in sandboxed CI runners with egress controls and no production secrets.
- Require allowlist approval for new lifecycle scripts in dependency diffs.
- Rotate credentials and re-audit workstations if a dev tool shows install-time network beacons.

## Straightforward Implementation

### 1. Install policy

```bash
npm install --ignore-scripts --registry https://internal.registry.example/ <dev-tool>
```

### 2. CI gate

```yaml
# .github/workflows/dev-tool-check.yml
- run: |
    npm ci --ignore-scripts
    git diff --exit-code .gitignore || true
- run: |
    # Reject unexpected public registry sources for internal dev tools
    grep -E '"registry": "https://registry.npmjs.org"' package-lock.json && exit 1 || true
- run: |
    # Flag new postinstall/preinstall scripts
    node scripts/scan-lifecycle-scripts.js --allowlist allowed-scripts.json
```

### 3. Diff review

Review every new `postinstall` or `preinstall` script, lockfile integrity change, and `.gitignore` entry in dependency update diffs. Use Socket or a custom PR check to flag them.

### 4. Isolation

Install dev tools in sandboxed CI runners with egress controls and no production secrets. Rotate CI credentials and audit developer workstations after any suspected install-time compromise.
