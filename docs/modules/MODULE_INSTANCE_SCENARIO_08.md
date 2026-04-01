# Module Instance: Scenario 08 (Package Lock File Manipulation)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This scenario gives a practical way to teach why lockfiles need review discipline, not blind trust.

## 1) Module Card

- **Module ID**: `08`
- **Title**: `Package Lock File Manipulation`
- **Level**: `Intermediate`
- **Estimated Time**: `60-90 minutes`
- **Primary Attack Surface**: `Lockfile integrity and dependency pinning`
- **Prerequisites**: lockfile and CI install mode familiarity

## 2) Learning Objectives

- Explain how lockfiles can be weaponized when trust is misplaced.
- Reproduce lockfile-driven malicious resolution in a safe lab.
- Detect tampered lock entries and integrity anomalies.
- Enforce deterministic install and review controls.

## 3) Threat Model Snapshot

- **Asset at risk**: deterministic dependency resolution guarantees
- **Trust edge abused**: source control -> install resolution trust
- **Attacker objective**: force install of malicious artifact via lockfile changes
- **Blast radius**: any environment consuming manipulated lockfile

## 4) Lab Setup

```bash
cd scenarios/08-package-lock-file-manipulation
export TESTBENCH_MODE=enabled
./setup.sh
```

## 5) Attack Walkthrough

1. Compare clean and manipulated lockfile.
2. Install dependencies from manipulated state.
3. Observe downstream behavior mismatch.

## 6) Detection Playbook

- **Static checks**: lockfile diff scrutiny, integrity/resolved URL validation.
- **Behavioral checks**: runtime indicators from unexpected package payload.
- **Evidence artifacts**: lockfile diffs, install logs, detector report.

## 7) Mitigation Playbook

- Protect lockfile changes with stricter review requirements.
- Use `npm ci` in CI to enforce deterministic resolution.
- Verify `resolved` and `integrity` fields against trusted sources.

## 8) Validation Checklist (Success Criteria)

- [ ] Lockfile tampering path demonstrated.
- [ ] Detection found manipulated entries reliably.
- [ ] CI-safe controls documented and tested.

## 9) Production Policy Snippet

```bash
git diff -- package-lock.json
node scripts/verify-lockfile-integrity.js package-lock.json
```

## 10) Debrief Questions

- What lockfile changes should always require security review?
- Why do teams over-trust lockfiles?
- Which review rule would have caught this fastest?
