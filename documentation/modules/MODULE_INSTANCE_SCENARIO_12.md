# Module Instance: Scenario 12 (Workspace/Monorepo Attack)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This module works well for teams running monorepos where one weak package can affect many services.

## 1) Module Card

- **Module ID**: `12`
- **Title**: `Workspace/Monorepo Attack`
- **Level**: `Intermediate`
- **Estimated Time**: `60-90 minutes`
- **Primary Attack Surface**: `Cross-workspace package trust`
- **Prerequisites**: npm workspaces/monorepo basics

## 2) Learning Objectives

- Explain trust assumptions in workspace dependency linking.
- Reproduce monorepo package compromise propagation.
- Detect malicious behavior crossing workspace boundaries.
- Apply workspace segmentation and script controls.

## 3) Threat Model Snapshot

- **Asset at risk**: all packages in shared monorepo
- **Trust edge abused**: workspace package -> sibling package trust
- **Attacker objective**: lateral movement through internal package links
- **Blast radius**: high across monorepo services/apps

## 4) Lab Setup

```bash
cd scenarios/12-workspace-monorepo-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

## 5) Attack Walkthrough

1. Inspect workspace package relationships.
2. Trigger compromise in one workspace package.
3. Observe effect on dependent workspace consumers.

## 6) Detection Playbook

- **Static checks**: workspace script review, internal dependency graph anomalies.
- **Behavioral checks**: cross-package runtime side effects and unexpected network calls.
- **Evidence artifacts**: workspace dependency map, logs, detector outputs.

## 7) Mitigation Playbook

- Restrict workspace scripts and postinstall behavior.
- Enforce package-level ownership and review boundaries.
- Add internal package signing/provenance checks where possible.

## 8) Validation Checklist (Success Criteria)

- [ ] Monorepo compromise path demonstrated.
- [ ] Cross-workspace indicators captured.
- [ ] Guardrails defined per workspace/package boundary.

## 9) Production Policy Snippet

```bash
node scripts/audit-workspace-scripts.js
node scripts/enforce-workspace-boundaries.js
```

## 10) Debrief Questions

- Where should workspace trust boundaries be enforced technically?
- Which workspace trust assumption failed?
- How should ownership and review be segmented?
