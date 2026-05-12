# Scenario 15: Developer Tool Compromise

- **Level**: Advanced
- **Estimated Time**: 45-60 minutes
- **Primary Attack Surface**: Developer tooling and install lifecycle hooks

## Learning Objectives

- Understand how compromised developer tools (CLI helpers, build plugins, local `npm` packages) can run arbitrary code during install or dev workflows.
- Practice spotting risky patterns such as `postinstall` scripts and outbound exfiltration when `TESTBENCH_MODE=enabled`.
- Learn mitigations: pin tools, verify checksums, restrict install scripts, and isolate build environments.

## Background

Developer tools are often installed from the same registries as application dependencies. If an attacker publishes or compromises a tool (or tricks a developer into installing a malicious fork), **lifecycle scripts** can run as soon as someone runs `npm install`. That code executes with the developer’s privileges and can steal tokens, environment variables, or source code. Real incidents often combine social engineering with script execution during install or build.

## Threat Model Snapshot

- **Asset at risk**: developer workstation credentials, local source code, CI bootstrap trust
- **Trust edge abused**: unverified install-time script execution in dev tooling packages
- **Attacker objective**: code execution during install and stealthy data beaconing
- **Blast radius**: all developers or CI agents installing the compromised tool

## Scenario Description

You explore a minimal “dev tool” delivered as a local package. A **legitimate** variant exists for comparison; the **malicious** variant runs a `postinstall` step that exfiltrates data to the scenario mock server when the testbench safety flag is on. Your tasks:

1. **Red team**: See how install-time execution leads to capture events.
2. **Blue team**: Inspect the victim app and `node_modules` for suspicious scripts.
3. **Defender**: Run the detector and interpret its recommendations.

## Setup

**Prerequisites:** Node.js 16+, npm

**Environment:**

```bash
cd scenarios/15-developer-tool-compromise
export TESTBENCH_MODE=enabled
./setup.sh
```

`./setup.sh` prepares `infrastructure/` (mock collector on port **3015**), `infrastructure/captured-data.json`, clears `victim-app/node_modules` for a clean install demo, and prints the same numbered steps as **Run the lab** below.

## Run the lab

### Terminal A — mock attacker server

```bash
node infrastructure/mock-server.js
```

### Terminal B — install malicious dev tool and run victim

```bash
cd victim-app
rm -rf node_modules package-lock.json
export TESTBENCH_MODE=enabled
npm install ../dev-tools/malicious-dev-tool
npm start
```

### Detection (from scenario root)

```bash
node detection-tools/dev-tool-compromise-detector.js victim-app
```

### Verify capture

```bash
curl -s http://127.0.0.1:3015/captured-data
```

### Cleanup (optional)

```bash
../../scripts/kill-port.sh 3015
```

## 📝 Lab Tasks

Follow **Run the lab** above first. The sections below provide reference layout, evidence locations, detection notes, and reporting prompts.

## Structure

- `dev-tools/legitimate-dev-tool/` — benign reference tool
- `dev-tools/malicious-dev-tool/` — tool with `postinstall` exfiltration (testbench-gated)
- `victim-app/` — sample app that installs the tool
- `infrastructure/` — mock exfil server (`mock-server.js`, `captured-data.json`)
- `detection-tools/` — `dev-tool-compromise-detector.js`

## Evidence

- HTTP capture: `http://localhost:3015/captured-data`
- File: `infrastructure/captured-data.json`

## Detection

From the scenario directory:

```bash
node detection-tools/dev-tool-compromise-detector.js victim-app
```

Key indicators to capture:

- `postinstall` script presence and obfuscated child-process/network calls
- Unexpected outbound request attempts during install
- Artifact creation in `infrastructure/captured-data.json`

## Mitigation Playbook

- Enforce `--ignore-scripts` for untrusted tool installs by default.
- Pin dev tooling versions and source from an approved internal registry.
- Require review/allowlist for new lifecycle scripts in dependency diffs.
- Isolate tool installation to sandboxed CI runners with egress controls.
- Rotate credentials after any install-time compromise simulation.

## Expected Outcome

- Entries appear in `infrastructure/captured-data.json` (and/or the mock `/captured-data` endpoint) after install/run with `TESTBENCH_MODE=enabled`.
- The detector flags suspicious install-time behavior (e.g. `postinstall` / exfil-related patterns).

## Validation Checklist

- [ ] I reproduced install-time execution safely in testbench mode.
- [ ] I captured at least two distinct indicators (script + behavior).
- [ ] I ran the detector and interpreted the key findings.
- [ ] I documented at least three production-ready mitigation controls.

## Hints

- Start from `victim-app/package.json` and installed `node_modules` lifecycle fields.
- If captures are empty, verify mock server is running on `3015` and `TESTBENCH_MODE=enabled`.
- Reset quickly with `../../scripts/kill-port.sh 3015`.

## Lab Report Prompts

- Which signal would detect this fastest in CI: script diff, egress alert, or integrity mismatch?
- What policy should gate developer-tool installs in high-trust repos?
- How do you balance developer experience with `ignore-scripts` hardening?

## Safety

All malicious behavior is gated by `TESTBENCH_MODE=enabled` and targets localhost only. Do not enable this mode on production systems or point exfiltration at real endpoints.

---

Happy learning!
