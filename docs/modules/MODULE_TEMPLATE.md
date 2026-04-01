# Supply Chain Module Template

Use this template when you are writing or teaching a scenario.  
It keeps the learning experience consistent without making every module feel copy-pasted.

## 1) Module Card

- **Module ID**: `NN`
- **Title**: `Attack Name`
- **Level**: `Beginner | Intermediate | Advanced`
- **Estimated Time**: `45-90 minutes`
- **Primary Attack Surface**: `Dependency | Registry | Build | Runtime | SBOM | Tooling`
- **Prerequisites**: `Tools + required baseline knowledge`

## 2) Learning Objectives

By the end, learners should be able to:

- Explain the attack mechanics in plain technical terms.
- Reproduce the attack in `TESTBENCH_MODE`.
- Identify reliable detection signals (static + runtime).
- Propose layered prevention controls that are realistic in production.

## 3) Threat Model Snapshot

- **Asset at risk**:
- **Trust edge abused**:
- **Attacker objective**:
- **Blast radius**:

## 4) Lab Setup

```bash
cd scenarios/NN-scenario-name
export TESTBENCH_MODE=enabled
./setup.sh
```

Optional infra:

```bash
node infrastructure/mock-server.js &
```

## 5) Attack Walkthrough

1. **Recon**: inspect package/resolver/toolchain assumptions.
2. **Exploit**: execute attacker action in isolated lab context.
3. **Observe impact**: verify compromise behavior and collect evidence.

## 6) Detection Playbook

- **Static checks**: suspicious manifests, scripts, ranges, signatures.
- **Behavioral checks**: network calls, file changes, process activity.
- **Evidence artifacts**: output files, logs, captured payloads.

## 7) Mitigation Playbook

- **Immediate containment**
- **Root-cause hardening**
- **Policy guardrails for CI/CD**

## 8) Validation Checklist (Success Criteria)

- [ ] Attack was reproduced safely in the simulator.
- [ ] At least two detection signals were captured.
- [ ] At least three mitigations were applied or documented.
- [ ] A production policy recommendation was produced.

## 9) Production Policy Snippet

Include one actionable policy snippet (for example: deterministic dependency policy, signed provenance gate, pinned versions, plugin allowlist).

## 10) Debrief Questions

- What trust assumption failed first?
- Which detection was fastest and most reliable?
- What control would have blocked this earliest?
