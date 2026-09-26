# Scenario 17: Multi-Stage Attack Chain

- **Level**: Advanced
- **Estimated Time**: 60-90 minutes
- **Primary Attack Surface**: Chained dependency compromise lifecycle










## Table of Contents

<div class="doc-toc">

- [Learning Objectives](#learning-objectives)
- [Background](#background)
- [Threat Model Snapshot](#threat-model-snapshot)
- [Scenario Description](#scenario-description)
- [Setup](#setup)
- [Run the lab](#run-the-lab)
- [📝 Lab Tasks](#📝-lab-tasks)
- [Structure](#structure)
- [Evidence](#evidence)
- [Detection](#detection)
- [Mitigation Playbook](#mitigation-playbook)
- [Expected Outcome](#expected-outcome)
- [Straightforward Implementation](#straightforward-implementation)
- [Validation Checklist](#validation-checklist)
- [Hints](#hints)
- [Lab Report Prompts](#lab-report-prompts)
- [Safety](#safety)

</div>

---
## Learning Objectives

- Understand how supply chain attacks **chain** stages (access → abuse → spread).
- Practice **correlating** evidence across stages into a single narrative ("kill chain").
- Learn mitigations: defense in depth, least privilege, monitoring, and staged rollback.

## Background

Single alerts are easy to dismiss. Real campaigns often include **initial access** (e.g. token or package foothold), **lateral or elevated abuse** (using stolen material), and **replication or persistence** (spreading configuration or artifacts). Security teams need tools that can relate events across time and components.

## Threat Model Snapshot

- **Asset at risk**: end-to-end software delivery trust and credentials
- **Trust edge abused**: stage handoff assumptions between package/build/runtime events
- **Attacker objective**: execute sequential compromise with low-noise indicators per stage
- **Blast radius**: expands with each stage if uncorrelated detections are ignored

## Scenario Description

This lab simulates a realistic three-stage supply-chain campaign:

1. **Stage 1 - Initial access via dependency**: a compromised or malicious dependency installs a foothold when the victim runs `npm install`.
2. **Stage 2 - Lateral movement via stolen CI token**: the foothold reads available CI secrets (for example, a registry publish token) and beacons them to the attacker.
3. **Stage 3 - Impact via registry publish**: the attacker uses the stolen token to publish a malicious version of an internal package, spreading the compromise downstream.

Unified evidence is written to `infrastructure/captured-data.json`. Your tasks:

1. **Red team**: Run the victim flow and observe the three stages in order.
2. **Blue team**: Read capture files and map events to initial access, lateral movement, and impact.
3. **Defender**: Run the correlator and verify it ties the stages into one chain.

## Setup

**Prerequisites:** Node.js 16+, npm

**Environment:**

```bash
cd scenarios/17-multi-stage-attack-chain
export TESTBENCH_MODE=enabled
./setup.sh
```

`./setup.sh` prepares `infrastructure/` (mock server on port **3017**), capture storage, clears `victim-app/node_modules`, and prints the same numbered steps as **Run the lab** below.

## Run the lab

### Terminal A - mock attacker server

```bash
node infrastructure/mock-server.js
```

### Terminal B - install stage packages and run victim

```bash
cd victim-app
rm -rf node_modules package-lock.json
npm install ../packages/stage1-access-lib ../packages/stage2-compromised-lib
export TESTBENCH_MODE=enabled
npm start
```

### Detection (from scenario root)

```bash
node detection-tools/multi-stage-correlator.js .
```

### Verify capture

```bash
curl -s http://127.0.0.1:3017/captured-data
```

### Cleanup (optional)

```bash
../../scripts/setup/kill-port.sh 3017
```

## 📝 Lab Tasks

Follow **Run the lab** above first. The sections below provide reference layout, evidence locations, detection notes, and reporting prompts.

## Structure

- `packages/stage1-access-lib/`, `packages/stage2-compromised-lib/` - staged dependencies
- `victim-app/` - orchestrates the chain
- `infrastructure/` - mock server (port **3017**), `captured-data.json`
- `detection-tools/` - `multi-stage-correlator.js`

## Evidence

- `http://localhost:3017/captured-data`
- `infrastructure/captured-data.json`

## Detection

From the scenario root:

```bash
node detection-tools/multi-stage-correlator.js .
```

Key indicators to capture:

- Stage 1: dependency install event followed by unexpected file writes or network beacons
- Stage 2: secret/token access (for example, `.npmrc` or CI env read) and exfiltration of a registry token
- Stage 3: publish event to the registry using the stolen token
- Shared identifiers across stage events (host/run/time adjacency)
- Correlator output tying stage1 -> stage2 -> stage3

## Mitigation Playbook

- Correlate initial dependency access, lateral CI token abuse, and registry publish events before closing alerts.
- Segment CI service accounts so build runners cannot publish packages or deploy to production.
- Trigger auto-containment when dependency install, secret access, and publish events occur in short windows.
- Preserve per-stage forensic artifacts and run attack-chain tabletop exercises quarterly.
- Enforce least privilege on CI tokens and require approval gates for registry publishes.
- Maintain dependency allowlists and anomaly thresholds for first-seen packages or rapid version jumps.

## Expected Outcome

- Captures show distinct stage markers over the run: initial access, token theft, and registry publish.
- The correlator reports a multi-stage chain (stage1 → stage2 → stage3) when evidence is present.

## Straightforward Implementation

### 1. Correlation rule (pseudo-Splunk)

```spl
| tstats `security` count from datamodel=Endpoint.Processes
  where Processes.process="npm install" by _time host
| join host [ search eventtype=network_traffic dest_port=443 ]
| where relative_time(_time,"-5m") < first_event_time
| where event_count >= 3
```

### 2. Segmentation

Use separate CI service accounts per stage. A build runner must not be able to publish packages or deploy to production. Store publish tokens in a dedicated secure vault, not in general build variables.

### 3. Auto-containment

Configure SOAR or CI webhooks to kill runners and revoke tokens when the sequence dependency install → secret access → registry publish occurs within a short window.

### 4. Tabletop exercises

Run quarterly attack-chain exercises against your CI/CD architecture. Preserve artifacts per stage for timeline reconstruction.

## Validation Checklist

- [ ] I observed evidence for each stage in order.
- [ ] I produced a coherent timeline from raw captures.
- [ ] I ran the correlator and validated its chain output.
- [ ] I proposed controls that interrupt stage progression early.

## Hints

- Start by identifying stage-specific markers before running correlation.
- If events are missing, verify server on `3017` and rerun victim flow.
- Use `../../scripts/setup/kill-port.sh 3017` between attempts to reset cleanly.

## Lab Report Prompts

- Which stage offered the earliest reliable containment point?
- What data sources should be correlated in a real SOC to replicate this view?
- How would you tune detections to reduce alert fatigue while still catching chains?

## Safety

All behavior is local and gated by `TESTBENCH_MODE=enabled`.

---

Happy learning!
