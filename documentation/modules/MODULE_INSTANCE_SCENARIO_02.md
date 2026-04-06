# Module Instance: Scenario 02 (Dependency Confusion)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

Use this module to show why enterprise registry defaults matter as much as code quality.

## 1) Module Card

- **Module ID**: `02`
- **Title**: `Dependency Confusion Attack`
- **Level**: `Beginner`
- **Estimated Time**: `45-60 minutes`
- **Primary Attack Surface**: `Registry resolution and package source trust`
- **Prerequisites**: Node.js 16+, npm, basic understanding of private/public registries

## 2) Learning Objectives

- Explain how package resolvers can prefer attacker-controlled public packages.
- Reproduce dependency confusion behavior in a local lab setup.
- Detect unexpected registry sources and suspicious version patterns.
- Apply scoped registry and deterministic install defenses.

## 3) Threat Model Snapshot

- **Asset at risk**: internal builds and runtime environments
- **Trust edge abused**: package manager -> registry selection logic
- **Attacker objective**: execute malicious code via substituted package source
- **Blast radius**: organization-wide if shared build config is vulnerable

## 4) Lab Setup

```bash
cd scenarios/02-dependency-confusion
export TESTBENCH_MODE=enabled
./setup.sh
```

## 5) Attack Walkthrough

1. Identify internal package naming patterns.
2. Publish or simulate attacker package with higher version.
3. Trigger install from victim app.
4. Confirm wrong-source package resolution and behavior.

## 6) Detection Playbook

- **Static checks**: `.npmrc` scope validation, lockfile source review, semver anomaly checks.
- **Behavioral checks**: monitor install/runtime network and postinstall activity.
- **Evidence artifacts**: installed package metadata, detector output, mock endpoint logs.

## 7) Mitigation Playbook

- Enforce scope-to-registry mapping for internal packages.
- Require lockfile usage and `npm ci` in CI.
- Block unapproved registries and suspicious high-version jumps.

## 8) Validation Checklist (Success Criteria)

- [ ] Confusion attack reproduced in isolated environment.
- [ ] Wrong registry source was detected and documented.
- [ ] Mitigation controls were implemented or drafted.

## 9) Production Policy Snippet

```ini
@company:registry=https://private-registry.example.com/
registry=https://registry.npmjs.org/
```

## 10) Debrief Questions

- What should be enforced at org level versus project level?
- Which resolver behavior enabled the substitution?
- Which check would have blocked this earliest?
