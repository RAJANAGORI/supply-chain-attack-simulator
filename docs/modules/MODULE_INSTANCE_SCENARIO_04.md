# Module Instance: Scenario 04 (Malicious Update)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This module is strongest when taught as a "safe-looking update" story that slowly reveals risk.

## 1) Module Card

- **Module ID**: `04`
- **Title**: `Malicious Update Attack`
- **Level**: `Intermediate`
- **Estimated Time**: `60-90 minutes`
- **Primary Attack Surface**: `Version ranges and automatic updates`
- **Prerequisites**: Semver basics, lockfile awareness

## 2) Learning Objectives

- Explain why patch/minor updates can still carry malicious code.
- Reproduce an auto-update compromise path safely.
- Detect suspicious update deltas and hidden runtime behavior.
- Enforce staged rollout and exact-version controls.

## 3) Threat Model Snapshot

- **Asset at risk**: applications using floating dependency ranges
- **Trust edge abused**: update trust in popular packages
- **Attacker objective**: ship malicious logic via seemingly normal update
- **Blast radius**: all consumers accepting update range

## 4) Lab Setup

```bash
cd scenarios/04-malicious-update
export TESTBENCH_MODE=enabled
./setup.sh
```

## 5) Attack Walkthrough

1. Inspect legitimate baseline package.
2. Compare with malicious update version.
3. Trigger update via range-compatible install.
4. Validate behavior and evidence capture.

## 6) Detection Playbook

- **Static checks**: release diff scrutiny, changelog mismatch, suspicious scripts.
- **Behavioral checks**: monitor runtime network and secret access.
- **Evidence artifacts**: version output, code diff results, detection tool reports.

## 7) Mitigation Playbook

- Pin critical dependencies exactly.
- Enforce update review gates and staged testing.
- Require lockfile commit checks and `npm ci` in CI.

## 8) Validation Checklist (Success Criteria)

- [ ] Malicious update path reproduced and explained.
- [ ] Detection captured both code and behavior indicators.
- [ ] Update governance controls defined for production.

## 9) Production Policy Snippet

```json
{
  "dependencies": {
    "critical-lib": "2.1.0"
  }
}
```

## 10) Debrief Questions

- Where should update risk acceptance be documented?
- Why do patch updates often evade scrutiny?
- What combination of controls best reduces update risk?
