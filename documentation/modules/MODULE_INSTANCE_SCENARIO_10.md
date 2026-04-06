# Module Instance: Scenario 10 (Git Submodule Attack)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This module is best taught with a source-control lens: dependency risk can enter through Git metadata.

## 1) Module Card

- **Module ID**: `10`
- **Title**: `Git Submodule Attack`
- **Level**: `Intermediate`
- **Estimated Time**: `60-90 minutes`
- **Primary Attack Surface**: `Submodule source trust`
- **Prerequisites**: Git and submodule fundamentals

## 2) Learning Objectives

- Explain how malicious submodules can introduce code execution risk.
- Reproduce submodule compromise path in testbench.
- Detect suspicious submodule references and updates.
- Apply repository boundary controls and submodule governance.

## 3) Threat Model Snapshot

- **Asset at risk**: repository integrity and build inputs
- **Trust edge abused**: parent repo -> submodule trust
- **Attacker objective**: execute/ship malicious content through source dependency
- **Blast radius**: all environments pulling affected repo

## 4) Lab Setup

```bash
cd scenarios/10-git-submodule-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

## 5) Attack Walkthrough

1. Inspect `.gitmodules` and baseline refs.
2. Trigger simulated malicious submodule update.
3. Observe build/runtime impact from injected source.

## 6) Detection Playbook

- **Static checks**: `.gitmodules` diff, remote URL trust, commit pinning drift.
- **Behavioral checks**: unexpected script execution or network activity.
- **Evidence artifacts**: git history, submodule commit map, scan output.

## 7) Mitigation Playbook

- Pin submodules to reviewed commits.
- Restrict allowable submodule remotes.
- Add CI checks for unauthorized `.gitmodules` changes.

## 8) Validation Checklist (Success Criteria)

- [ ] Malicious submodule path reproduced.
- [ ] Detection captured unauthorized source shift.
- [ ] Submodule trust controls defined in policy.

## 9) Production Policy Snippet

```bash
git submodule status --recursive
node scripts/validate-submodule-remotes.js
```

## 10) Debrief Questions

- How should submodule changes be approved in your workflow?
- Which source trust check was missing?
- How should teams gate submodule updates?
