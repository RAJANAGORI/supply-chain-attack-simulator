# Module Instance: Scenario 15 (Developer Tool Compromise)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This scenario resonates with developer teams because it targets tools they use every day.

## 1) Module Card

- **Module ID**: `15`
- **Title**: `Developer Tool Compromise`
- **Level**: `Advanced`
- **Estimated Time**: `45-75 minutes`
- **Primary Attack Surface**: `IDE/CLI/dev-tool package trust`
- **Prerequisites**: development tooling lifecycle familiarity

## 2) Learning Objectives

- Explain why trusted tooling can become a high-impact attack vector.
- Reproduce safe tool compromise behavior in simulation.
- Detect suspicious install hooks and dev-time execution patterns.
- Apply workstation and CI guardrails for tooling trust.

## 3) Threat Model Snapshot

- **Asset at risk**: developer environment, source code, and secrets
- **Trust edge abused**: developer tool install/update trust
- **Attacker objective**: execute payloads during normal development workflows
- **Blast radius**: multiple repos and environments through shared tooling

## 4) Lab Setup

```bash
cd scenarios/15-developer-tool-compromise
export TESTBENCH_MODE=enabled
./setup.sh
```

Run flow for delivery:

```bash
# Terminal A
node infrastructure/mock-server.js

# Terminal B
cd victim-app
npm install ../dev-tools/malicious-dev-tool
npm start

# Detection (scenario root)
node detection-tools/dev-tool-compromise-detector.js victim-app
curl -s http://127.0.0.1:3015/captured-data
```

## 5) Attack Walkthrough

1. Inspect tool package baseline and scripts.
2. Trigger compromised tool install or execution path.
3. Observe malicious behavior during development workflow.

## 6) Detection Playbook

- **Static checks**: install hooks, suspicious dependencies, obfuscated logic.
- **Behavioral checks**: unusual local process/network/file access during tool usage.
- **Evidence artifacts**: install logs, scanner output, captured telemetry.

## 7) Mitigation Playbook

- Restrict tool install sources and enforce allowlists.
- Isolate dev tools from sensitive credentials where possible.
- Add periodic tool integrity and behavior scans.

## 8) Validation Checklist (Success Criteria)

- [ ] Tool compromise behavior reproduced safely.
- [ ] Detection captured dev-time execution anomalies.
- [ ] Practical controls defined for dev and CI environments.

## 9) Production Policy Snippet

```bash
node scripts/scan-dev-tool-scripts.js
node scripts/enforce-tool-allowlist.js
```

## 10) Debrief Questions

- What developer experience trade-off is acceptable for safer tooling?
- Why are developer tools high-leverage targets?
- Which controls reduce risk without blocking productivity?
