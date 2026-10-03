# Detection Runbook: Scenario 12 (Workspace/Monorepo Attack)

## IOCs
- Workspace package unexpectedly replaced/overwritten.
- Local package path mutation during monorepo install workflow.
- New or changed task dependency in `nx.json` or `turbo.json` that broadens the blast radius.
- Capture events to `127.0.0.1:3000`.

## Sample Log Lines
```json
{"scenario_id":"12","event_type":"workspace_package_swap","source":"packages/utils","destination":"127.0.0.1:3000","timestamp_utc":"2026-04-20T12:55:00Z"}
```

## Sigma (example)
```yaml
title: Monorepo Workspace Replacement Activity
detection:
  selection:
    process.command_line|contains|all: ["npm", "install"]
    file.path|contains: "packages/"
  condition: selection
level: medium
```

## YARA-like Text Rule (example)
```text
rule Workspace_Attack_IOC {
  strings:
    $a = "workspaces"
    $b = "packages/utils"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- File path replacement under monorepo package directories.
- Unexpected script/network behavior from workspace-local package.
- Evidence in mock capture JSON.


## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc12-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 12`.

## Mitigation

- Assign CODEOWNERS to workspace package directories, root `package.json`, and task configuration files such as `nx.json` or `turbo.json`.
- Review `nx graph` or `turbo run` task boundaries before adding cross-package dependencies or tasks.
- Run workspace scans for lifecycle scripts, unexpected binaries, and dependency drift on every PR.
- Enforce `--ignore-scripts` in CI and require explicit allowlisting for required postinstall steps.
- Separate build/test/deploy permissions per workspace package and per CI stage.
- Treat every workspace package as a third-party dependency for security review.

## Straightforward Implementation

The full step-by-step implementation flow lives in the [scenario README](README.md#straightforward-implementation) to keep this runbook focused on detection.
