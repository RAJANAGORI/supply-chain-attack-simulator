# Module Instance: Scenario 17 (Multi-Stage Attack Chain)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

Use this as a correlation exercise where learners connect multiple weak signals into one clear narrative.

## 1) Module Card

- **Module ID**: `17`
- **Title**: `Multi-Stage Attack Chain`
- **Level**: `Advanced`
- **Estimated Time**: `60-90 minutes`
- **Primary Attack Surface**: `Cross-stage supply chain trust`
- **Prerequisites**: foundational knowledge across earlier scenarios

## 2) Learning Objectives

- Explain chained attack progression across multiple trust edges.
- Reproduce and analyze stage-by-stage compromise behavior.
- Correlate evidence into a coherent incident timeline.
- Prioritize containment by business impact and stage criticality.

## 3) Threat Model Snapshot

- **Asset at risk**: end-to-end software delivery integrity
- **Trust edge abused**: multiple (dependency -> build -> runtime)
- **Attacker objective**: maximize impact while reducing detection likelihood
- **Blast radius**: very high due to coordinated chain effects

## 4) Lab Setup

```bash
cd scenarios/17-multi-stage-attack-chain
export TESTBENCH_MODE=enabled
./setup.sh
```

Run flow for delivery:

```bash
# Terminal A
node infrastructure/mock-server.js

# Terminal B
cd victim-app
npm install ../packages/stage1-access-lib ../packages/stage2-compromised-lib
npm start

# Detection (scenario root)
node detection-tools/multi-stage-correlator.js .
curl -s http://127.0.0.1:3017/captured-data
```

## 5) Attack Walkthrough

1. Identify stage boundaries and expected transitions.
2. Execute or observe chain progression.
3. Map impact per stage and downstream consequence.

## 6) Detection Playbook

- **Static checks**: artifacts/config drift across stages.
- **Behavioral checks**: correlated suspicious events over time.
- **Evidence artifacts**: stage logs, timeline reconstruction, detector outputs.

## 7) Mitigation Playbook

- Break chain by enforcing controls at earliest stage.
- Introduce stage-specific verification and trust gating.
- Build response playbook for coordinated containment.

## 8) Validation Checklist (Success Criteria)

- [ ] Multi-stage timeline accurately reconstructed.
- [ ] Cross-stage evidence correlation demonstrated.
- [ ] Prioritized mitigation plan produced.

## 9) Production Policy Snippet

```bash
node scripts/correlate-supply-chain-events.js
node scripts/enforce-stage-gates.js
```

## 10) Debrief Questions

- Which stage is your best choke point for prevention?
- Which stage had the best break-the-chain opportunity?
- How should response teams coordinate cross-stage incidents?
