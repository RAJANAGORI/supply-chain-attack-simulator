# Module Instance: Scenario 14 (Container Image Supply Chain Attack)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This module connects software supply chain risk to container build and runtime operations.

## 1) Module Card

- **Module ID**: `14`
- **Title**: `Container Image Supply Chain Attack`
- **Level**: `Advanced`
- **Estimated Time**: `60-120 minutes`
- **Primary Attack Surface**: `Image layers and registry trust`
- **Prerequisites**: container image and runtime fundamentals

## 2) Learning Objectives

- Explain how compromised images/base layers affect application trust.
- Reproduce image-layer attack behavior in controlled environment.
- Detect malicious layer and runtime exfiltration signals.
- Apply image signing/provenance and runtime controls.

## 3) Threat Model Snapshot

- **Asset at risk**: containerized workloads and runtime secrets
- **Trust edge abused**: image registry -> deployment runtime
- **Attacker objective**: inject malicious behavior through image supply chain
- **Blast radius**: all deployments using poisoned image lineage

## 4) Lab Setup

```bash
cd scenarios/14-container-image-supply-chain-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

## 5) Attack Walkthrough

1. Review baseline image history and layers.
2. Build/run compromised image variant.
3. Observe startup behavior and exfiltration evidence.

## 6) Detection Playbook

- **Static checks**: layer history anomalies, digest drift, unsigned image indicators.
- **Behavioral checks**: runtime egress activity and suspicious startup scripts.
- **Evidence artifacts**: image metadata, runtime logs, detector output.

## 7) Mitigation Playbook

- Enforce signed images and provenance attestations.
- Pin by digest and gate deployment on verification.
- Apply runtime network and secret access restrictions.

## 8) Validation Checklist (Success Criteria)

- [ ] Malicious image behavior reproduced and captured.
- [ ] Layer/runtime signals analyzed correctly.
- [ ] Deployment policies updated with enforceable checks.

## 9) Production Policy Snippet

```bash
node scripts/verify-image-provenance.js
node scripts/block-unsigned-images.js
```

## 10) Debrief Questions

- Which runtime control best limits damage if image checks fail?
- Which layer introduced the highest risk?
- What controls protect both build-time and runtime?
