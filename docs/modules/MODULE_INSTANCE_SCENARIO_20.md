# Module Instance: Scenario 20 (Package Version Confusion)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

Use this module to teach how resolver behavior and loose ranges can silently drift from policy.

## 1) Module Card

- **Module ID**: `20`
- **Title**: `Package Version Confusion`
- **Level**: `Advanced`
- **Estimated Time**: `45-75 minutes`
- **Primary Attack Surface**: `Resolver policy and version-selection logic`
- **Prerequisites**: npm semver/range understanding, lockfile basics, registry configuration awareness

## 2) Learning Objectives

- Explain version confusion and "highest version wins" abuse.
- Reproduce suspicious resolution behavior in a controlled registry simulation.
- Detect semver anomalies and pinning gaps with provided detectors.
- Propose deterministic install policy and enforcement controls.

## 3) Threat Model Snapshot

- **Asset at risk**: dependency integrity and trusted runtime behavior
- **Trust edge abused**: package manager -> registry metadata/version selection
- **Attacker objective**: force installation of attacker-controlled high version
- **Blast radius**: broad, especially in CI and fresh install environments

## 4) Lab Setup

```bash
cd scenarios/20-package-version-confusion
export TESTBENCH_MODE=enabled
./setup.sh
node infrastructure/mock-server.js &
```

Run victim simulation:

```bash
cd victim-app
npm start
```

Detection and evidence:

```bash
# from scenario root
node detection-tools/version-confusion-detector.js victim-app
curl -s http://127.0.0.1:3020/captured-data
cat victim-app/installed-version.json
```

## 5) Attack Walkthrough

1. Inspect available versions from local registry layout.
2. Trigger victim resolution path with loose version rules.
3. Confirm selected package via `installed-version.json`.
4. Verify controlled malicious behavior/evidence in mock server output.

## 6) Detection Playbook

- **Static checks**
  - Detect risky ranges (`*`, broad `^`, unexpected jumps).
  - Review registry source and resolved package metadata.
- **Behavioral checks**
  - Observe runtime exfiltration path in testbench mode.
  - Compare selected version to expected policy baseline.
- **Evidence artifacts**
  - `victim-app/installed-version.json`
  - `infrastructure/captured-data.json`
  - `node detection-tools/version-confusion-detector.js victim-app`

## 7) Mitigation Playbook

- Pin exact versions for critical dependencies.
- Enforce lockfile integrity and source verification.
- Restrict scope-to-registry mappings and block unknown registries.
- Fail CI on abnormal semver deltas or unreviewed resolver drift.

## 8) Validation Checklist (Success Criteria)

- [ ] Malicious high-version selection is reproduced in simulator.
- [ ] Detector flags suspicious resolution behavior.
- [ ] Resolver output is compared against policy baseline.
- [ ] Mitigation controls are translated into CI-enforceable checks.

## 9) Production Policy Snippet

```json
{
  "dependencyPolicy": {
    "requireExactForCritical": true,
    "denyLooseRanges": ["*", "^"],
    "requireLockfileInCI": true
  }
}
```

## 10) Debrief Questions

- Which dependency classes must never use loose ranges?
- What resolver rule allowed attacker-controlled selection?
- Which signal had the strongest confidence with lowest noise?
- What policy should block this class of attack by default?
