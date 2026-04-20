# Scenario 17: Multi-Stage Attack Chain

- **Level**: Advanced
- **Estimated Time**: 60-90 minutes
- **Primary Attack Surface**: Chained dependency compromise lifecycle

## Learning Objectives

- Understand how supply chain attacks **chain** stages (access → abuse → spread).
- Practice **correlating** evidence across stages into a single narrative (“kill chain”).
- Learn mitigations: defense in depth, least privilege, monitoring, and staged rollback.

## Background

Single alerts are easy to dismiss. Real campaigns often include **initial access** (e.g. token or package foothold), **lateral or elevated abuse** (using stolen material), and **replication or persistence** (spreading configuration or artifacts). Security teams need tools that can relate events across time and components.

## Threat Model Snapshot

- **Asset at risk**: end-to-end software delivery trust and credentials
- **Trust edge abused**: stage handoff assumptions between package/build/runtime events
- **Attacker objective**: execute sequential compromise with low-noise indicators per stage
- **Blast radius**: expands with each stage if uncorrelated detections are ignored

## Scenario Description

This lab simulates three stages with staged packages and a victim app:

1. **Stage 1** — initial access; writes local artifacts and emits stage-1 evidence.
2. **Stage 2** — uses prior artifacts, emits stage-2 evidence.
3. **Stage 3** — replication-style behavior and stage-3 evidence.

Unified evidence is written to `infrastructure/captured-data.json`. Your tasks:

1. **Red team**: Run the victim flow and observe ordering of stages.
2. **Blue team**: Read capture files and map events to stages.
3. **Defender**: Run the correlator and verify it ties stages together.

## Setup

**Prerequisites:** Node.js 16+, npm

**Environment:**

```bash
cd scenarios/17-multi-stage-attack-chain
export TESTBENCH_MODE=enabled
./setup.sh
```

Start the mock server if needed:

```bash
node infrastructure/mock-server.js &
```

Install stage packages into `victim-app` per the script, then `npm start`.

## Structure

- `packages/stage1-access-lib/`, `packages/stage2-compromised-lib/` — staged dependencies
- `victim-app/` — orchestrates the chain
- `infrastructure/` — mock server (port **3017**), `captured-data.json`
- `detection-tools/` — `multi-stage-correlator.js`

## Evidence

- `http://localhost:3017/captured-data`
- `infrastructure/captured-data.json`

## Detection

From the scenario root:

```bash
node detection-tools/multi-stage-correlator.js .
```

Key indicators to capture:

- Ordered stage markers in capture payloads
- Shared identifiers across stage events (host/run/time adjacency)
- Correlator output tying stage1 -> stage2 -> stage3

## Mitigation Playbook

- Add correlation rules that require cross-stage context before closing alerts.
- Segment credentials and permissions to block stage progression.
- Trigger automated containment when stage transitions occur in short windows.
- Preserve forensic artifacts per stage for post-incident timeline reconstruction.
- Run attack-chain tabletop exercises against your CI/CD architecture.

## Expected Outcome

- Captures show distinct stage markers over the run.
- The correlator reports a multi-stage chain (e.g. stage1 → stage2 → stage3) when evidence is present.

## Validation Checklist

- [ ] I observed evidence for each stage in order.
- [ ] I produced a coherent timeline from raw captures.
- [ ] I ran the correlator and validated its chain output.
- [ ] I proposed controls that interrupt stage progression early.

## Hints

- Start by identifying stage-specific markers before running correlation.
- If events are missing, verify server on `3017` and rerun victim flow.
- Use `../../scripts/kill-port.sh 3017` between attempts to reset cleanly.

## Lab Report Prompts

- Which stage offered the earliest reliable containment point?
- What data sources should be correlated in a real SOC to replicate this view?
- How would you tune detections to reduce alert fatigue while still catching chains?

## Safety

All behavior is local and gated by `TESTBENCH_MODE=enabled`.

---

Happy learning!
