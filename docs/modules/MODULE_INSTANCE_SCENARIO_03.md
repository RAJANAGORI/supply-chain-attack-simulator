# Module Instance: Scenario 03 (Compromised Package)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This scenario helps teams practice the hard moment when a trusted dependency stops being trustworthy.

## 1) Module Card

- **Module ID**: `03`
- **Title**: `Compromised Package`
- **Level**: `Beginner`
- **Estimated Time**: `60 minutes`
- **Primary Attack Surface**: `Trusted package publisher and release channel`
- **Prerequisites**: Scenario 01-02 familiarity, npm basics

## 2) Learning Objectives

- Explain how trusted packages become attack vectors after account/package compromise.
- Reproduce a controlled compromised-release flow.
- Detect suspicious deltas in package behavior and metadata.
- Design containment and trust-restoration actions.

## 3) Threat Model Snapshot

- **Asset at risk**: downstream applications using trusted package
- **Trust edge abused**: maintainer/release trust
- **Attacker objective**: piggyback malicious logic into trusted dependency
- **Blast radius**: ecosystem-wide depending on package popularity

## 4) Lab Setup

```bash
cd scenarios/03-compromised-package
export TESTBENCH_MODE=enabled
./setup.sh
```

## 5) Attack Walkthrough

1. Compare legitimate and compromised package variants.
2. Install/execute compromised release from victim path.
3. Observe stealthy malicious behavior with normal functionality preserved.

## 6) Detection Playbook

- **Static checks**: code diff, new scripts/hooks, suspicious dependency changes.
- **Behavioral checks**: outbound calls, sensitive env access, runtime anomalies.
- **Evidence artifacts**: scanner results, installed package files, captured endpoint data.

## 7) Mitigation Playbook

- Freeze to known-good versions and rotate trust credentials.
- Require release provenance/signature verification.
- Add policy checks for risky behavior in dependency updates.

## 8) Validation Checklist (Success Criteria)

- [ ] Compromised behavior identified from evidence.
- [ ] At least two detection methods validated.
- [ ] Recovery and prevention actions documented.

## 9) Production Policy Snippet

```bash
npm ci
node scripts/verify-provenance.js
```

## 10) Debrief Questions

- How would you communicate this to leadership without causing panic?
- What made the compromised release appear trustworthy?
- How should teams restore trust after incident response?
