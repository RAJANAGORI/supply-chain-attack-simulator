# Scenario 15: Developer Tool Compromise

## Learning Objectives

- Understand how compromised developer tools (CLI helpers, build plugins, local `npm` packages) can run arbitrary code during install or dev workflows.
- Practice spotting risky patterns such as `postinstall` scripts and outbound exfiltration when `TESTBENCH_MODE=enabled`.
- Learn mitigations: pin tools, verify checksums, restrict install scripts, and isolate build environments.

## Background

Developer tools are often installed from the same registries as application dependencies. If an attacker publishes or compromises a tool (or tricks a developer into installing a malicious fork), **lifecycle scripts** can run as soon as someone runs `npm install`. That code executes with the developer’s privileges and can steal tokens, environment variables, or source code. Real incidents often combine social engineering with script execution during install or build.

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

Start the mock listener (if not already running, e.g. outside the dashboard):

```bash
node infrastructure/mock-server.js &
```

Then follow the printed steps: install the malicious dev tool into `victim-app`, run the app, and run detection from the scenario root.

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

## Expected Outcome

- Entries appear in `infrastructure/captured-data.json` (and/or the mock `/captured-data` endpoint) after install/run with `TESTBENCH_MODE=enabled`.
- The detector flags suspicious install-time behavior (e.g. `postinstall` / exfil-related patterns).

## Safety

All malicious behavior is gated by `TESTBENCH_MODE=enabled` and targets localhost only. Do not enable this mode on production systems or point exfiltration at real endpoints.

---

Happy learning!
