# Module Instance: Scenario 18 (Package Manager Plugin Attack)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This module is ideal for teaching install-time tampering that happens outside normal app code paths.

## 1) Module Card

- **Module ID**: `18`
- **Title**: `Package Manager Plugin Attack`
- **Level**: `Advanced`
- **Estimated Time**: `45-75 minutes`
- **Primary Attack Surface**: `Plugin hooks in install workflows`
- **Prerequisites**: package manager plugin/hook concepts

## 2) Learning Objectives

- Explain plugin hook abuse in dependency installation flows.
- Reproduce plugin-based tampering behavior safely.
- Detect hook-level modifications and install-time anomalies.
- Enforce plugin trust and isolation controls.

## 3) Threat Model Snapshot

- **Asset at risk**: dependency installation integrity
- **Trust edge abused**: package manager -> plugin execution trust
- **Attacker objective**: tamper with packages during install lifecycle
- **Blast radius**: all projects using compromised plugin

## 4) Lab Setup

```bash
cd scenarios/18-package-manager-plugin-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

## 5) Attack Walkthrough

1. Inspect plugin hook points and expected behavior.
2. Execute install with malicious plugin path.
3. Validate package tampering indicators.

## 6) Detection Playbook

- **Static checks**: plugin source review, unexpected hook registrations.
- **Behavioral checks**: package mutations during install, anomalous script execution.
- **Evidence artifacts**: plugin logs, modified files, detector output.

## 7) Mitigation Playbook

- Use plugin allowlists and signature/provenance checks.
- Isolate build environment from untrusted plugin execution.
- Alert on unexpected plugin/hook changes.

## 8) Validation Checklist (Success Criteria)

- [ ] Plugin tampering scenario reproduced.
- [ ] Hook-level detection signals captured.
- [ ] Plugin governance policy documented.

## 9) Production Policy Snippet

```bash
node scripts/audit-package-manager-plugins.js
node scripts/enforce-plugin-allowlist.js
```

## 10) Debrief Questions

- Which plugin permissions should be denied by default?
- Why are plugin hooks a stealthy attack point?
- Which enforcement control gives fastest risk reduction?
