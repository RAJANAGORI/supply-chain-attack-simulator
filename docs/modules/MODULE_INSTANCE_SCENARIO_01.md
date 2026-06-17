# Module Instance: Scenario 01 (Typosquatting)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This module works well as the first live demo because learners immediately see how a small typo turns into real risk.

## 1) Module Card

- **Module ID**: `01`
- **Title**: `Typosquatting Attack`
- **Level**: `Beginner`
- **Estimated Time**: `30-45 minutes`
- **Primary Attack Surface**: `Dependency name trust`
- **Prerequisites**: Node.js 16+, npm, basic CLI familiarity

## 2) Learning Objectives

- Explain how typo-based package selection can lead to malicious installs.
- Reproduce controlled exfiltration behavior in `TESTBENCH_MODE`.
- Detect suspicious package behavior using static and runtime signals.
- Apply controls that reduce accidental malicious installs.

## 3) Threat Model Snapshot

- **Asset at risk**: developer secrets and runtime environment variables
- **Trust edge abused**: developer -> package manager (name resolution by human input)
- **Attacker objective**: silent code execution and data exfiltration
- **Blast radius**: one project to many projects if typo propagates in docs/scripts

## 4) Lab Setup

```bash
cd scenarios/01-typosquatting
export TESTBENCH_MODE=enabled
./setup.sh
node infrastructure/mock-server.js &
```

## 5) Attack Walkthrough

1. Inspect legitimate package behavior.
2. Create typo package (`request-lib` vs `requests-lib`) with mixed benign/malicious behavior.
3. Install typo package from victim app and execute runtime path.
4. Validate captured payload in local mock server.

## 6) Detection Playbook

- **Static checks**
  - Inspect `node_modules/request-lib/package.json` and `index.js`.
  - Flag suspicious install scripts, obfuscation, and hidden network calls.
- **Behavioral checks**
  - Monitor local outbound requests during package execution.
  - Confirm unexpected access to environment variables.
- **Evidence artifacts**
  - `http://localhost:3000/captured-data`
  - `infrastructure/mock-server.js` logs

## 7) Mitigation Playbook

- Enforce package allowlists for critical dependencies.
- Use lockfiles + deterministic installs in CI (`npm ci`).
- Gate new dependency introduction behind security review checklist.
- Add typosquat/package-risk scanner in CI.

## 8) Validation Checklist (Success Criteria)

- [ ] Typosquatting flow reproduced in local testbench.
- [ ] Exfiltration evidence captured from local mock endpoint.
- [ ] At least two detection techniques validated.
- [ ] At least three mitigations documented with implementation owners.

## 9) Production Policy Snippet

```bash
# Example CI policy
npm ci
node detection-tools/package-scanner.js .
```

Require exact review approval for new dependency names in pull requests.

## 10) Debrief Questions

- If this happened in a pull request, what review check should block it?
- Why was this attack successful despite package functionality appearing normal?
- Which detection method identified risk first?
- Which one control would have blocked this in the first 5 minutes?
