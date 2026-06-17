# Module Instance: Scenario 16 (Package Cache Poisoning)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This module shows how compromise can survive reinstalls when cache trust is not controlled.

## 1) Module Card

- **Module ID**: `16`
- **Title**: `Package Cache Poisoning`
- **Level**: `Intermediate`
- **Estimated Time**: `45-75 minutes`
- **Primary Attack Surface**: `Local/shared package caches`
- **Prerequisites**: package install/cache behavior basics

## 2) Learning Objectives

- Explain how poisoned caches can persist malicious artifacts.
- Reproduce cache poisoning behavior in a controlled lab.
- Detect cache-driven reinstall anomalies.
- Apply cache hygiene and integrity checks.

## 3) Threat Model Snapshot

- **Asset at risk**: local and CI install integrity
- **Trust edge abused**: cached artifact -> reinstall trust
- **Attacker objective**: persist malicious package across reinstalls
- **Blast radius**: repeated compromise in affected environments

## 4) Lab Setup

```bash
cd scenarios/16-package-cache-poisoning
export TESTBENCH_MODE=enabled
./setup.sh
```

Run flow for delivery:

```bash
# Terminal A
node infrastructure/mock-server.js

# Terminal B
cd victim-app
npm install
rm -rf node_modules package-lock.json && npm install
npm start

# Detection (scenario root)
node detection-tools/cache-poisoning-detector.js victim-app
curl -s http://127.0.0.1:3016/captured-data
```

## 5) Attack Walkthrough

1. Populate baseline cache with expected artifacts.
2. Introduce poisoned cache state in simulation.
3. Reinstall dependencies and observe repeated compromise.

## 6) Detection Playbook

- **Static checks**: cache metadata/hash integrity validation.
- **Behavioral checks**: compromise persists despite reinstall.
- **Evidence artifacts**: cache inspection outputs, install logs, detector reports.

## 7) Mitigation Playbook

- Purge/refresh caches on integrity failures.
- Enforce artifact verification before cache reuse.
- Segment cache trust boundaries in CI and developer machines.

## 8) Validation Checklist (Success Criteria)

- [ ] Cache poisoning persistence demonstrated.
- [ ] Integrity checks identified poisoned artifacts.
- [ ] Cache hygiene controls operationalized.

## 9) Production Policy Snippet

```bash
node scripts/verify-cache-integrity.js
node scripts/purge-cache-on-failure.js
```

## 10) Debrief Questions

- When should caches be invalidated automatically?
- Why does cache trust often become implicit?
- Which cache controls are most practical in CI?
