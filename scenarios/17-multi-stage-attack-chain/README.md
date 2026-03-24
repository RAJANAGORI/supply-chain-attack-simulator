# Scenario 17: Multi-Stage Attack Chain

## Learning Objectives

- Understand how supply chain attacks **chain** stages (access → abuse → spread).
- Practice **correlating** evidence across stages into a single narrative (“kill chain”).
- Learn mitigations: defense in depth, least privilege, monitoring, and staged rollback.

## Background

Single alerts are easy to dismiss. Real campaigns often include **initial access** (e.g. token or package foothold), **lateral or elevated abuse** (using stolen material), and **replication or persistence** (spreading configuration or artifacts). Security teams need tools that can relate events across time and components.

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

## Expected Outcome

- Captures show distinct stage markers over the run.
- The correlator reports a multi-stage chain (e.g. stage1 → stage2 → stage3) when evidence is present.

## Safety

All behavior is local and gated by `TESTBENCH_MODE=enabled`.

---

Happy learning!
