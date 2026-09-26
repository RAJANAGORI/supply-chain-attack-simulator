# Scenario 18: Package Manager Hook Abuse (pnpm `.pnpmfile.cjs`)

- **Level**: Advanced
- **Estimated Time**: 45-60 minutes
- **Primary Attack Surface**: pnpm hook file execution during install



## Table of Contents

<div class="doc-toc">

- [Learning Objectives](#learning-objectives)
- [Background](#background)
- [Threat Model Snapshot](#threat-model-snapshot)
- [Scenario Description](#scenario-description)
- [Setup](#setup)
- [Run the lab](#run-the-lab)
- [Lab Tasks](#lab-tasks)
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
## Table of Contents

- [Learning Objectives](#learning-objectives)
- [Background](#background)
- [Threat Model Snapshot](#threat-model-snapshot)
- [Scenario Description](#scenario-description)
- [Setup](#setup)
- [Run the lab](#run-the-lab)
- [Lab Tasks](#lab-tasks)
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

---

## Learning Objectives

- Understand how pnpm `.pnpmfile.cjs` hook files execute during every `pnpm install`.
- See how the `readPackage` hook can silently inject dependencies into the dependency tree.
- Practice detecting hook files, lockfile drift, and import-time payloads.
- Learn mitigations: hook allowlists, lockfile verification, CI isolation, and dependency review.

## Background

pnpm loads `.pnpmfile.cjs` from the project root automatically. The file exports hooks such as `readPackage(pkg, context)`, which runs for every package during install and can mutate the manifest before pnpm resolves dependencies.

A malicious `.pnpmfile.cjs` can:

- Add, remove, or replace dependencies without touching `package.json`.
- Downgrade packages to vulnerable versions.
- Inject a dependency that exfiltrates data at import time.

Because the change happens in the hook, it appears in `pnpm-lock.yaml` but not in the committed `package.json`. Teams that only review `package.json` diffs will miss it.

## Threat Model Snapshot

- **Asset at risk**: dependency tree integrity and source-of-truth in lockfiles.
- **Trust edge abused**: pnpm automatically executes `.pnpmfile.cjs` with project-level permissions.
- **Attacker objective**: persist a malicious dependency through installs without modifying `package.json`.
- **Blast radius**: every developer and CI runner that runs `pnpm install` in the repo.

## Scenario Description

A repository contains a hidden `.pnpmfile.cjs`. The `readPackage` hook detects when `TESTBENCH_MODE=enabled` and injects `malicious-logger` as a dependency of `target-lib`. When the victim app starts, it imports `target-lib`, which pulls in `malicious-logger`. The logger exfiltrates selected environment variables to the mock server at `127.0.0.1:3018` on import.

Your tasks:

1. **Red team**: Confirm that `.pnpmfile.cjs` injects the dependency and that the app exfiltrates on import.
2. **Blue team**: Find the hook file, the lockfile drift, and the injected `node_modules` entry.
3. **Defender**: Run the detector and review the mitigation controls.

## Setup

**Prerequisites:** Node.js 16+, npm (pnpm is invoked via `npx`).

```bash
cd scenarios/18-package-manager-plugin-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

`./setup.sh` prepares `infrastructure/` (mock server on port **3018**), capture storage, clears `victim-app/node_modules`, and prints the numbered steps below.

## Run the lab

### Terminal A - mock attacker server

```bash
node infrastructure/mock-server.js
```

Leave this running.

### Terminal B - install with pnpm and run the victim app

```bash
cd victim-app
export TESTBENCH_MODE=enabled
npx pnpm@9.15.9 install
npm start
```

The `npx pnpm install` step loads `.pnpmfile.cjs`. The hook injects `malicious-logger` into `target-lib`'s dependencies. When `npm start` imports `target-lib`, `malicious-logger` runs its import-time payload.

### Detection (from scenario root)

```bash
node detection-tools/plugin-attack-detector.js victim-app
```

### Verify capture

```bash
curl -s http://127.0.0.1:3018/captured-data
```

### Cleanup (optional)

```bash
../../scripts/setup/kill-port.sh 3018
```

## Lab Tasks

1. Read `.pnpmfile.cjs` and identify the `readPackage` hook.
2. Compare `victim-app/package.json` with `victim-app/pnpm-lock.yaml`. Where does `malicious-logger` appear?
3. Check `node_modules/malicious-logger/index.js`. Why does it exfiltrate on import instead of using a lifecycle script?
4. Run the detector and explain each finding.

## Structure

- `packages/target-lib/` - benign library imported by the victim app.
- `packages/malicious-logger/` - import-time payload injected by the hook.
- `victim-app/.pnpmfile.cjs` - malicious pnpm hook file.
- `victim-app/package.json` - declares only `target-lib`; the hook adds `malicious-logger`.
- `infrastructure/` - mock server (port **3018**), `captured-data.json`.
- `detection-tools/plugin-attack-detector.js` - flags hook files and injected dependencies.

## Evidence

- `http://localhost:3018/captured-data`
- `infrastructure/captured-data.json`
- `victim-app/.pnpmfile.cjs`
- `victim-app/pnpm-lock.yaml`
- `victim-app/node_modules/malicious-logger/`

## Detection

```bash
node detection-tools/plugin-attack-detector.js victim-app
```

Key indicators:

- Presence of `.pnpmfile.cjs` in the project root.
- `readPackage` hook that mutates `dependencies`.
- `pnpm-lock.yaml` contains packages not declared in `package.json`.
- Import-time exfiltration in `node_modules` payload files.

## Mitigation Playbook

- Treat `.pnpmfile.cjs` and `.yarn/plugins/*` as code requiring the same review as build scripts.
- Require CODEOWNERS approval for any hook file or plugin change.
- Run `pnpm install --frozen-lockfile` in CI and fail if `pnpm-lock.yaml` changes unexpectedly.
- Compare resolved dependencies against `package.json` declared dependencies in CI.
- Use isolated CI runners with restricted egress for install steps.
- Pin pnpm version and validate its checksum in CI.

## Expected Outcome

- `pnpm install` silently adds `malicious-logger` to the lockfile and node_modules.
- `npm start` triggers import-time exfiltration captured by the mock server.
- The detector flags the hook file, lockfile drift, and injected dependency.

## Straightforward Implementation

### 1. CODEOWNERS for hook files

```text
# .github/CODEOWNERS
.pnpmfile.cjs    @org/security-team
.yarn/plugins/*  @org/security-team
```

### 2. CI gate - fail on frozen lockfile changes

```yaml
# .github/workflows/ci.yml
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
- name: Install with frozen lockfile
  run: npx pnpm install --frozen-lockfile
- name: Verify no unexpected lockfile changes
  run: git diff --exit-code pnpm-lock.yaml
```

### 3. Detect injected dependencies

```bash
# Compare package.json deps to lockfile
npx pnpm list --json | jq '.dependencies | keys'
# Review any package in the lockfile that is not in package.json
```

### 4. Isolate install in CI

```yaml
- name: Install in sandbox
  run: npx pnpm install --frozen-lockfile
  env:
    NODE_ENV: production
```

## Validation Checklist

- [ ] I reproduced `.pnpmfile.cjs` injecting a dependency during install.
- [ ] I observed import-time exfiltration when the victim app started.
- [ ] I identified the injected package in `pnpm-lock.yaml` and `node_modules`.
- [ ] I confirmed detector findings against the hook file and lockfile drift.
- [ ] I documented at least three controls for hook-file governance.

## Hints

- Start by reading `.pnpmfile.cjs` before running `pnpm install`.
- Use `git diff` on `pnpm-lock.yaml` after install to see the injected dependency.
- If no capture appears, verify the mock server is running on port **3018** and `TESTBENCH_MODE=enabled` is set.

## Lab Report Prompts

1. How does `.pnpmfile.cjs` differ from a malicious `postinstall` script in terms of visibility and persistence?
2. Why is reviewing only `package.json` diffs insufficient for pnpm projects?
3. What CI controls would prevent a malicious hook file from reaching production?
4. How would you detect this attack in an environment without pnpm (for example, a team migrating from npm)?

## Safety

This lab contains intentionally vulnerable code for education only.

- Run only in isolated environments.
- Exfiltration targets `127.0.0.1:3018` only.
- The payload gates on `TESTBENCH_MODE=enabled`.
- Do not publish `malicious-logger` or `.pnpmfile.cjs` outside this lab.
