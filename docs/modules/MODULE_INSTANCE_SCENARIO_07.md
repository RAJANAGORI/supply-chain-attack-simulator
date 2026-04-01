# Module Instance: Scenario 07 (Transitive Dependency Attack)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This module is useful for teaching that "not in package.json" does not mean "not your problem."

## 1) Module Card

- **Module ID**: `07`
- **Title**: `Transitive Dependency Attack`
- **Level**: `Intermediate`
- **Estimated Time**: `60-90 minutes`
- **Primary Attack Surface**: `Dependencies of dependencies`
- **Prerequisites**: npm dependency tree basics

## 2) Learning Objectives

- Explain why transitive packages are difficult to monitor.
- Reproduce a transitive compromise path safely.
- Detect hidden risk in dependency graphs.
- Apply graph-wide auditing and policy controls.

## 3) Threat Model Snapshot

- **Asset at risk**: applications importing deeply nested packages
- **Trust edge abused**: direct dependency -> transitive dependency trust inheritance
- **Attacker objective**: evade review via lower-visibility package
- **Blast radius**: broad via shared transitive packages

## 4) Lab Setup

```bash
cd scenarios/07-transitive-dependency
export TESTBENCH_MODE=enabled
./setup.sh
```

## 5) Attack Walkthrough

1. Map dependency tree and locate transitive path.
2. Trigger install/execution through direct dependency.
3. Observe unexpected transitive behavior.

## 6) Detection Playbook

- **Static checks**: `npm ls`, lockfile traversal, suspicious transitive scripts.
- **Behavioral checks**: runtime network or filesystem anomalies from indirect packages.
- **Evidence artifacts**: tree snapshots, detector outputs, endpoint captures.

## 7) Mitigation Playbook

- Enforce transitive dependency auditing in CI.
- Pin/override risky transitive packages.
- Add allow/deny rules for known bad patterns.

## 8) Validation Checklist (Success Criteria)

- [ ] Transitive attack chain reconstructed.
- [ ] Hidden dependency risk surfaced with evidence.
- [ ] Mitigation actions mapped to CI workflow.

## 9) Production Policy Snippet

```bash
npm ls --all > dependency-tree.txt
node scripts/scan-transitive-risk.js dependency-tree.txt
```

## 10) Debrief Questions

- Which transitive dependency deserves immediate pinning or override?
- Why are transitive dependencies often under-reviewed?
- What controls scale best for deep trees?
