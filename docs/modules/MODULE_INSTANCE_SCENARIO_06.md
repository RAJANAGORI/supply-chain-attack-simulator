# Module Instance: Scenario 06 (SHA-Hulud)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

Treat this as an incident-response training module, not just an exploit walkthrough.

## 1) Module Card

- **Module ID**: `06`
- **Title**: `SHA-Hulud Self-Replicating Supply Chain Attack`
- **Level**: `Advanced`
- **Estimated Time**: `120+ minutes`
- **Primary Attack Surface**: `Self-propagation through dependency ecosystem`
- **Prerequisites**: Incident response basics, advanced dependency analysis

## 2) Learning Objectives

- Explain self-replicating supply chain attack mechanics.
- Reproduce safe simulation of propagation behavior.
- Correlate indicators across multiple compromise stages.
- Prioritize containment and recovery operations.

## 3) Threat Model Snapshot

- **Asset at risk**: package ecosystem integrity and maintainer credentials
- **Trust edge abused**: package install hooks and credential context
- **Attacker objective**: spread compromise across additional packages/projects
- **Blast radius**: potentially massive due to chained propagation

## 4) Lab Setup

```bash
cd scenarios/06-sha-hulud
export TESTBENCH_MODE=enabled
./setup.sh
```

## 5) Attack Walkthrough

1. Inspect simulated propagation payload logic.
2. Trigger initial compromise in controlled environment.
3. Observe replication indicators and downstream effects.

## 6) Detection Playbook

- **Static checks**: suspicious install hooks, encoded payloads, credential-access code.
- **Behavioral checks**: repeated package mutation patterns, anomalous outbound traffic.
- **Evidence artifacts**: propagation logs, detector outputs, compromised package traces.

## 7) Mitigation Playbook

- Revoke/rotate impacted credentials and keys immediately.
- Freeze publication and quarantine suspect packages.
- Add hook restrictions and credential isolation in CI/dev.

## 8) Validation Checklist (Success Criteria)

- [ ] Replication flow understood and evidenced.
- [ ] Multi-stage detection timeline produced.
- [ ] Containment + recovery plan documented.

## 9) Production Policy Snippet

```bash
node scripts/audit-install-hooks.js
node scripts/enforce-no-publish-from-ci-without-attestation.js
```

## 10) Debrief Questions

- What is your first 30-minute containment plan?
- What accelerated propagation most?
- Which controls reduce dwell time and spread?
