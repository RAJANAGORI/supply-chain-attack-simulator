# Module Instance: Scenario 09 (Package Signing Bypass)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

Use this module to discuss the difference between cryptographic validity and operational trust.

## 1) Module Card

- **Module ID**: `09`
- **Title**: `Package Signing Bypass`
- **Level**: `Advanced`
- **Estimated Time**: `90+ minutes`
- **Primary Attack Surface**: `Signature trust and key management`
- **Prerequisites**: cryptographic signing concepts, CI policy basics

## 2) Learning Objectives

- Explain how signing can fail when keys or process are compromised.
- Reproduce bypass patterns in a controlled simulation.
- Detect key/provenance anomalies and behavior mismatches.
- Layer signing with runtime and pipeline controls.

## 3) Threat Model Snapshot

- **Asset at risk**: authenticity guarantees for dependencies/artifacts
- **Trust edge abused**: signing key ownership and verification workflow
- **Attacker objective**: make malicious package appear legitimate
- **Blast radius**: high for systems relying solely on signatures

## 4) Lab Setup

```bash
cd scenarios/09-package-signing-bypass
export TESTBENCH_MODE=enabled
./setup.sh
```

## 5) Attack Walkthrough

1. Inspect baseline signed package flow.
2. Trigger bypass scenario (key/process abuse simulation).
3. Validate compromised but apparently signed package behavior.

## 6) Detection Playbook

- **Static checks**: key provenance, signer identity drift, signature metadata anomalies.
- **Behavioral checks**: runtime activity inconsistent with claimed update purpose.
- **Evidence artifacts**: verification logs, key metadata, detector output.

## 7) Mitigation Playbook

- Rotate/restrict keys and enforce short-lived credentials.
- Require provenance attestation beyond signature presence.
- Add behavioral gating for high-risk updates.

## 8) Validation Checklist (Success Criteria)

- [ ] Bypass path explained with evidence.
- [ ] Detection included both cryptographic and behavioral indicators.
- [ ] Defense plan includes key lifecycle and policy controls.

## 9) Production Policy Snippet

```bash
node scripts/verify-signature-and-attestation.js
node scripts/block-unknown-signers.js
```

## 10) Debrief Questions

- What key-management step would have reduced blast radius most?
- Why is "signed" not equal to "safe"?
- Which additional control closes signing blind spots?
