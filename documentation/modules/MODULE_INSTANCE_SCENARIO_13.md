# Module Instance: Scenario 13 (Package Metadata Manipulation)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

Use this module to teach that metadata is evidence, not proof, until it is verified.

## 1) Module Card

- **Module ID**: `13`
- **Title**: `Package Metadata Manipulation`
- **Level**: `Intermediate`
- **Estimated Time**: `45-75 minutes`
- **Primary Attack Surface**: `Metadata and provenance fields`
- **Prerequisites**: package metadata and integrity basics

## 2) Learning Objectives

- Explain how spoofed metadata can mislead dependency trust decisions.
- Reproduce metadata inconsistency attack simulation.
- Detect mismatches between metadata, tarball source, and integrity values.
- Enforce metadata validation in CI.

## 3) Threat Model Snapshot

- **Asset at risk**: dependency source authenticity
- **Trust edge abused**: metadata claims -> install decisions
- **Attacker objective**: disguise malicious source as legitimate package
- **Blast radius**: broad when metadata is a primary trust signal

## 4) Lab Setup

```bash
cd scenarios/13-package-metadata-manipulation
export TESTBENCH_MODE=enabled
./setup.sh
```

Run flow for delivery:

```bash
# Terminal A
node infrastructure/mock-server.js

# Terminal B
cd victim-app
npm install ../compromised-packages/clean-utils
TESTBENCH_MODE=enabled node index.js

# Detection (scenario root)
node detection-tools/metadata-validator.js victim-app/node_modules/clean-utils
curl -s http://127.0.0.1:3001/captured-data
```

## 5) Attack Walkthrough

1. Inspect expected package metadata fields.
2. Trigger install path with manipulated metadata.
3. Observe mismatch indicators and runtime behavior.

## 6) Detection Playbook

- **Static checks**: `resolved` URL and integrity mismatch, author/repo anomalies.
- **Behavioral checks**: runtime signals inconsistent with expected package behavior.
- **Evidence artifacts**: metadata snapshots, integrity check logs, scanner output.

## 7) Mitigation Playbook

- Validate metadata against trusted registry/source policies.
- Reject integrity/source mismatches automatically.
- Cross-check metadata against SBOM and lockfile.

## 8) Validation Checklist (Success Criteria)

- [ ] Metadata manipulation path reproduced.
- [ ] Mismatch detection demonstrated.
- [ ] CI policy checks defined and testable.

## 9) Production Policy Snippet

```bash
node scripts/validate-package-metadata.js
node scripts/enforce-resolved-source-policy.js
```

## 10) Debrief Questions

- Which metadata mismatch should be treated as a hard failure?
- Which metadata fields are most security-critical?
- How can teams avoid trusting metadata alone?
