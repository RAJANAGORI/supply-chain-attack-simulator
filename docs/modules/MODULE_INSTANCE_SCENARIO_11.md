# Module Instance: Scenario 11 (Registry Mirror Poisoning)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This scenario is especially relevant for larger organizations with internal registries or mirrors.

## 1) Module Card

- **Module ID**: `11`
- **Title**: `Registry Mirror Poisoning`
- **Level**: `Advanced`
- **Estimated Time**: `90+ minutes`
- **Primary Attack Surface**: `Internal package mirror trust`
- **Prerequisites**: enterprise registry architecture familiarity

## 2) Learning Objectives

- Explain how compromised mirrors can poison trusted installs.
- Reproduce mirror poisoning behavior in local simulation.
- Detect upstream mismatch and mirrored artifact anomalies.
- Implement mirror hardening and verification controls.

## 3) Threat Model Snapshot

- **Asset at risk**: organization-wide dependency supply path
- **Trust edge abused**: internal mirror -> package manager
- **Attacker objective**: serve malicious artifacts via trusted mirror
- **Blast radius**: very high in enterprise deployments

## 4) Lab Setup

```bash
cd scenarios/11-registry-mirror-poisoning
export TESTBENCH_MODE=enabled
./setup.sh
```

## 5) Attack Walkthrough

1. Review mirror and upstream baseline mapping.
2. Trigger poisoned mirror artifact retrieval.
3. Confirm victim installation from compromised mirror source.

## 6) Detection Playbook

- **Static checks**: checksum mismatch versus upstream, mirror metadata anomalies.
- **Behavioral checks**: suspicious package behavior after mirror-sourced install.
- **Evidence artifacts**: source logs, hash comparisons, detector reports.

## 7) Mitigation Playbook

- Enforce mirror-to-upstream integrity validation.
- Segment mirror infrastructure and lock administration paths.
- Add periodic trust-anchor and checksum reconciliation jobs.

## 8) Validation Checklist (Success Criteria)

- [ ] Mirror poisoning flow reproduced safely.
- [ ] Integrity mismatch detected and explained.
- [ ] Mitigations translated into enterprise policy.

## 9) Production Policy Snippet

```bash
node scripts/verify-mirror-upstream-digests.js
node scripts/block-unverified-mirror-artifacts.js
```

## 10) Debrief Questions

- What mirror monitoring metric gives the earliest warning?
- Why are mirrors high-value attacker targets?
- Which control should fail closed first?
