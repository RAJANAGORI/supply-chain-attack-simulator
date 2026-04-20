# Detection Runbook: Scenario 12 (Workspace/Monorepo Attack)

## IOCs
- Workspace package unexpectedly replaced/overwritten.
- Local package path mutation during monorepo install workflow.
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
