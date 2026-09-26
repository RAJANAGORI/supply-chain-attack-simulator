# Scenario 15: Developer Tool Compromise

- **Level**: Advanced
- **Estimated Time**: 45-60 minutes
- **Primary Attack Surface**: Developer tooling and install lifecycle hooks










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

- Understand how compromised developer tools (CLI helpers, build plugins, local `npm` packages) can run arbitrary code during install or dev workflows.
- Practice spotting risky patterns such as `postinstall` scripts and outbound exfiltration when `TESTBENCH_MODE=enabled`.
- Learn mitigations: pin tools, verify checksums, restrict install scripts, and isolate build environments.

## Background

Developer tools are often installed from the same registries as application dependencies. If an attacker publishes or compromises a tool (or tricks a developer into installing a malicious fork), **lifecycle scripts** can run as soon as someone runs `npm install`. That code executes with the developer's privileges and can steal tokens, environment variables, or source code. Real incidents often combine social engineering with script execution during install or build.

## Threat Model Snapshot

- **Asset at risk**: developer workstation credentials, local source code, CI bootstrap trust
- **Trust edge abused**: unverified install-time script execution in dev tooling packages
- **Attacker objective**: code execution during install and stealthy data beaconing
- **Blast radius**: all developers or CI agents installing the compromised tool

## Scenario Description

You explore a minimal "dev tool" delivered as a local package. A legitimate variant exists for comparison; the malicious variant runs a `postinstall` step that exfiltrates data to the scenario mock server when the testbench safety flag is on. In the second stage, the tool also tampers with the lockfile or `.gitignore` so the compromise is not reviewed or committed cleanly. Your tasks:

1. **Red team**: See how install-time execution leads to capture events and stealth artifacts.
2. **Blue team**: Inspect the victim app, `node_modules`, lockfile, and `.gitignore` for suspicious changes.
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

### Terminal A - mock attacker server

```bash
node infrastructure/mock-server.js
```

### Terminal B - install malicious dev tool and run victim

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
../../scripts/setup/kill-port.sh 3015
```

## 📝 Lab Tasks

Follow **Run the lab** above first. The sections below provide reference layout, evidence locations, detection notes, and reporting prompts.

## Structure

- `dev-tools/legitimate-dev-tool/` - benign reference tool
- `dev-tools/malicious-dev-tool/` - tool with `postinstall` exfiltration (testbench-gated)
- `victim-app/` - sample app that installs the tool
- `infrastructure/` - mock exfil server (`mock-server.js`, `captured-data.json`)
- `detection-tools/` - `dev-tool-compromise-detector.js`

## Evidence

- HTTP capture: `http://localhost:3015/captured-data`
- File: `infrastructure/captured-data.json`
- Lockfile changes: unexpected registry sources, altered integrity hashes, or added transitive dependencies
- `.gitignore` changes: new entries that hide tool artifacts, logs, or exfil payloads from version control

## Detection

From the scenario directory:

```bash
node detection-tools/dev-tool-compromise-detector.js victim-app
```

Key indicators to capture:

- `postinstall` script presence and obfuscated child-process/network calls
- Unexpected outbound request attempts during install
- Artifact creation in `infrastructure/captured-data.json`
- Lockfile drift that hides malicious transitive dependencies or changes registry sources
- `.gitignore` entries added during install that would keep tool artifacts out of version control

## Mitigation Playbook

- Install dev tools with `--ignore-scripts` by default and source only from approved registries.
- Review lockfile and `.gitignore` diffs for hidden entries after any tool install or update.
- Pin dev tool versions and verify checksums before distribution to developers.
- Run tool installs in sandboxed CI runners with egress controls and no production secrets.
- Require allowlist approval for new lifecycle scripts in dependency diffs.
- Rotate credentials and re-audit workstations if a dev tool shows install-time network beacons.

## Expected Outcome

- Entries appear in `infrastructure/captured-data.json` (and/or the mock `/captured-data` endpoint) after install/run with `TESTBENCH_MODE=enabled`.
- The detector flags suspicious install-time behavior (e.g. `postinstall` / exfil-related patterns).
- You can spot lockfile or `.gitignore` changes that the tool tried to hide.

## Straightforward Implementation

### 1. Install policy

```bash
npm install --ignore-scripts --registry https://internal.registry.example/ <dev-tool>
```

### 2. CI gate

```yaml
# .github/workflows/dev-tool-check.yml
- run: |
    npm ci --ignore-scripts
    git diff --exit-code .gitignore || true
- run: |
    # Reject unexpected public registry sources for internal dev tools
    grep -E '"registry": "https://registry.npmjs.org"' package-lock.json && exit 1 || true
- run: |
    # Flag new postinstall/preinstall scripts
    node scripts/scan-lifecycle-scripts.js --allowlist allowed-scripts.json
```

### 3. Diff review

Review every new `postinstall` or `preinstall` script, lockfile integrity change, and `.gitignore` entry in dependency update diffs. Use Socket or a custom PR check to flag them.

### 4. Isolation

Install dev tools in sandboxed CI runners with egress controls and no production secrets. Rotate CI credentials and audit developer workstations after any suspected install-time compromise.

## Validation Checklist

- [ ] I reproduced install-time execution safely in testbench mode.
- [ ] I captured at least two distinct indicators (script + behavior).
- [ ] I ran the detector and interpreted the key findings.
- [ ] I documented at least three production-ready mitigation controls.

## Hints

- Start from `victim-app/package.json` and installed `node_modules` lifecycle fields.
- If captures are empty, verify mock server is running on `3015` and `TESTBENCH_MODE=enabled`.
- Reset quickly with `../../scripts/setup/kill-port.sh 3015`.

## Lab Report Prompts

- Which signal would detect this fastest in CI: script diff, egress alert, or integrity mismatch?
- What policy should gate developer-tool installs in high-trust repos?
- How do you balance developer experience with `ignore-scripts` hardening?

## Safety

All malicious behavior is gated by `TESTBENCH_MODE=enabled` and targets localhost only. Do not enable this mode on production systems or point exfiltration at real endpoints.

---

Happy learning!
