# Scenario 18: Package Manager Plugin Attack

## Learning Objectives

- Understand how **package-manager plugins** (hooks that run during install) can alter projects or inject payloads.
- Practice detecting hook surfaces and injection markers on disk.
- Learn mitigations: allowlist plugins, review hook code, run installs in isolated CI, and verify `node_modules` integrity.

## Background

Many ecosystems support plugins or hooks that execute when dependencies are installed. A malicious plugin can **intercept** installs, patch files under `node_modules`, or phone home. Unlike a single bad package, the plugin may affect **every** install in a repo.

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

## Expected Outcome

- Captures reflect plugin-driven exfiltration when the testbench flag is on.
- The detector flags hook-related patterns and suspicious changes under the project tree.

## Safety

Localhost-only exfiltration; requires `TESTBENCH_MODE=enabled`.

---

Happy learning!
