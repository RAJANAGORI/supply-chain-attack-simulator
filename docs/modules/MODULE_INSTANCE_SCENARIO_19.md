# Module Instance: Scenario 19 (SBOM Manipulation Attack)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This scenario helps teams validate that SBOM workflows are accurate enough for real decision-making.

## 1) Module Card

- **Module ID**: `19`
- **Title**: `SBOM Manipulation Attack`
- **Level**: `Advanced`
- **Estimated Time**: `45-75 minutes`
- **Primary Attack Surface**: `SBOM generation and integrity`
- **Prerequisites**: SBOM concepts and dependency inventory basics

## 2) Learning Objectives

- Explain how incomplete or falsified SBOMs hide dependency risk.
- Reproduce SBOM manipulation behavior in simulator.
- Detect mismatches between declared and actual dependencies.
- Enforce SBOM authenticity and cross-verification controls.

## 3) Threat Model Snapshot

- **Asset at risk**: software inventory accuracy and compliance assurance
- **Trust edge abused**: SBOM pipeline -> security decision trust
- **Attacker objective**: conceal malicious components from governance tools
- **Blast radius**: high for compliance, risk, and incident response quality

## 4) Lab Setup

```bash
cd scenarios/19-sbom-manipulation-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

## 5) Attack Walkthrough

1. Generate baseline SBOM and dependency graph.
2. Introduce manipulated/omitted SBOM content.
3. Compare declared versus observed package reality.

## 6) Detection Playbook

- **Static checks**: SBOM-to-lockfile/package graph comparison.
- **Behavioral checks**: runtime/package behavior not represented in SBOM.
- **Evidence artifacts**: SBOM files, diff reports, verification script output.

## 7) Mitigation Playbook

- Sign SBOM outputs and attest generation pipeline.
- Cross-validate SBOMs against actual install graphs.
- Fail builds on unresolved inventory mismatches.

## 8) Validation Checklist (Success Criteria)

- [ ] Manipulated SBOM conditions reproduced.
- [ ] Mismatch detection produced clear evidence.
- [ ] Authenticity and verification controls implemented.

## 9) Production Policy Snippet

```bash
node scripts/verify-sbom-authenticity.js
node scripts/compare-sbom-to-lockfile.js
```

## 10) Debrief Questions

- How often should SBOM truth be cross-validated?
- Why can SBOM confidence be misleading?
- Which validation should be mandatory in CI?
