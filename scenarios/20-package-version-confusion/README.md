# Scenario 20: Package Version Confusion

- **Level**: Advanced
- **Estimated Time**: 45-60 minutes
- **Primary Attack Surface**: Version resolution and registry precedence




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
- [Validation Checklist](#validation-checklist)
- [Hints](#hints)
- [Lab Report Prompts](#lab-report-prompts)
- [Safety](#safety)

</div>

---
## Learning Objectives

- Understand **version confusion**: risky resolution rules that pick an attacker-controlled **high** version (or wrong registry) over an intended release.
- Practice detecting suspicious version skew and semver abuse in a project.
- Learn mitigations: **pin** versions, use lockfiles, verify registry scope, and block “latest wins” patterns for critical deps.

## Background

Attackers may publish a package under the same name with an **implausibly high** version or exploit resolver precedence so that `*` or loose ranges pull malware. Teams that rely on “highest semver wins” without registry controls are exposed—especially in split public/private registry setups (classic dependency confusion) or custom registries.

## Threat Model Snapshot

- **Asset at risk**: dependency selection integrity at install time
- **Trust edge abused**: permissive semver/version precedence and weak registry policy
- **Attacker objective**: force malicious high-version resolution
- **Blast radius**: all builds resolving from affected registry/range rules

## Scenario Description

This lab uses a **local registry layout** with multiple versions of one library. The victim resolver chooses the **highest** available version, which is malicious under `TESTBENCH_MODE=enabled`, then loads it and exfiltrates. Your tasks:

1. **Red team**: Observe which version is selected and why.
2. **Blue team**: Record the resolved version in `installed-version.json` (or equivalent) and compare to policy.
3. **Defender**: Run the detector and tighten pinning guidance.

## Setup

**Prerequisites:** Node.js 16+, npm

**Environment:**

```bash
cd scenarios/20-package-version-confusion
export TESTBENCH_MODE=enabled
./setup.sh
```

`./setup.sh` prepares `infrastructure/` (mock server on port **3020**), capture storage, clears `victim-app/node_modules`, and prints the same numbered steps as **Run the lab** below.

## Run the lab

### Terminal A — mock attacker server

```bash
node infrastructure/mock-server.js
```

### Terminal B — resolve/install and run victim flow

```bash
cd victim-app
rm -rf node_modules package-lock.json
npm install
export TESTBENCH_MODE=enabled
npm start
```

### Detection (from scenario root)

```bash
node detection-tools/version-confusion-detector.js victim-app
```

### Verify capture

```bash
curl -s http://127.0.0.1:3020/captured-data
```

### Cleanup (optional)

```bash
../../scripts/kill-port.sh 3020
```

## 📝 Lab Tasks

Follow **Run the lab** above first. The sections below provide reference layout, evidence locations, detection notes, and reporting prompts.

## Structure

- `registry/` — versioned package payloads (e.g. benign vs malicious semver folders)
- `victim-app/` — resolver simulation and install output (`installed-version.json`)
- `infrastructure/` — mock server (port **3020**), `captured-data.json`
- `detection-tools/` — `version-confusion-detector.js`

## Evidence

- `http://localhost:3020/captured-data`
- `infrastructure/captured-data.json`

## Detection

```bash
node detection-tools/version-confusion-detector.js victim-app
```

Key indicators to capture:

- Unexpected high version selected in `installed-version.json`
- Loose ranges (`*`, broad carets) on sensitive dependencies
- Runtime evidence of malicious branch execution on `3020`

## Mitigation Playbook

- Pin exact versions for critical dependencies and enforce lockfile usage.
- Scope private packages explicitly to internal registry endpoints.
- Alert on unusual semver jumps and first-seen maintainers.
- Require human review for dependency version changes above policy thresholds.
- Prefer deterministic `npm ci` workflows in CI.

## Expected Outcome

- The victim selects the attacker’s high version; evidence may show exfiltration when enabled.
- The detector warns on suspicious ranges, version jumps, or pinning gaps.

## Validation Checklist

- [ ] I observed malicious high-version selection behavior.
- [ ] I captured the selected version and related evidence.
- [ ] I ran detector checks and mapped warnings to actual risks.
- [ ] I documented controls to prevent version confusion in production.

## Hints

- Confirm selected version artifact before and after `npm start`.
- If capture is empty, verify mock server on `3020` and `TESTBENCH_MODE=enabled`.
- Use `../../scripts/kill-port.sh 3020` for cleanup.

## Lab Report Prompts

- Which policy catches this earliest: scoped registry rules, pinning, or semver gate?
- How should teams balance patch agility with strict pinning?
- What telemetry is required to detect version confusion at scale?

## Safety

Local simulation only; requires `TESTBENCH_MODE=enabled` for malicious branches.

---

Happy learning!
