# Scenario 18: Package Manager Plugin Attack

- **Level**: Advanced
- **Estimated Time**: 45-60 minutes
- **Primary Attack Surface**: Package-manager plugin/hook execution

## Learning Objectives

- Understand how **package-manager plugins** (hooks that run during install) can alter projects or inject payloads.
- Practice detecting hook surfaces and injection markers on disk.
- Learn mitigations: allowlist plugins, review hook code, run installs in isolated CI, and verify `node_modules` integrity.

## Background

Many ecosystems support plugins or hooks that execute when dependencies are installed. A malicious plugin can **intercept** installs, patch files under `node_modules`, or phone home. Unlike a single bad package, the plugin may affect **every** install in a repo.

## Threat Model Snapshot

- **Asset at risk**: install pipeline integrity and dependency tree trust
- **Trust edge abused**: plugin hooks executing with project-level permissions
- **Attacker objective**: inject malicious changes broadly across installs
- **Blast radius**: all installs using the compromised plugin configuration

## Scenario Description

This lab models a plugin as a Node module exporting `installHook({ projectRoot })`. The victim loads an **active** plugin configuration, invokes the hook, and the malicious plugin injects markers and exfiltrates to the mock server when `TESTBENCH_MODE=enabled`. Your tasks:

1. **Red team**: Trace hook execution from `victim-app` into `plugins/`.
2. **Blue team**: Find injected artifacts next to the targeted library.
3. **Defender**: Run the detector and review isolation recommendations.

## Setup

**Prerequisites:** Node.js 16+, npm

**Environment:**

```bash
cd scenarios/18-package-manager-plugin-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

Start the mock server if needed:

```bash
node infrastructure/mock-server.js &
```

From `victim-app/`, run `npm start` (per setup; cleans `node_modules` as directed).

## Structure

- `plugins/legitimate-plugin/`, `plugins/malicious-plugin/` — reference vs malicious hook implementations
- `packages/target-lib/` — library the hook targets
- `victim-app/` — loads plugin and runs the scenario (`plugin-active.js`, scripts)
- `infrastructure/` — mock server (port **3018**), `captured-data.json`
- `detection-tools/` — `plugin-attack-detector.js`

## Evidence

- `http://localhost:3018/captured-data`
- `infrastructure/captured-data.json`

## Detection

```bash
node detection-tools/plugin-attack-detector.js victim-app
```

Key indicators to capture:

- Presence of non-baseline plugin hooks in active config
- File modifications under target dependency after install
- Beacon evidence in `infrastructure/captured-data.json`

## Mitigation Playbook

- Enforce plugin allowlists with signed/approved plugin sources.
- Block arbitrary plugin execution in CI and controlled developer images.
- Run integrity checks on `node_modules` and generated lockfile state.
- Review plugin code changes with same rigor as build scripts.
- Alert on hook-driven modifications outside expected paths.

## Expected Outcome

- Captures reflect plugin-driven exfiltration when the testbench flag is on.
- The detector flags hook-related patterns and suspicious changes under the project tree.

## Validation Checklist

- [ ] I reproduced plugin-driven compromise in testbench mode.
- [ ] I captured both configuration and runtime indicators.
- [ ] I confirmed detector findings against observed injected artifacts.
- [ ] I documented at least three controls for plugin governance.

## Hints

- Start by reading active plugin wiring in `victim-app` before execution.
- If no captures appear, verify mock server on `3018`.
- Cleanup fast with `../../scripts/kill-port.sh 3018`.

## Lab Report Prompts

- Which policy should be mandatory first: allowlist, signature, or runtime isolation?
- How would you detect unauthorized plugin introduction in pull requests?
- What would a safe plugin review checklist include?

## Safety

Localhost-only exfiltration; requires `TESTBENCH_MODE=enabled`.

---

Happy learning!
