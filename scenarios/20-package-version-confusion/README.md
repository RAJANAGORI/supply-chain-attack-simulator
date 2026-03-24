# Scenario 20: Package Version Confusion

## Learning Objectives

- Understand **version confusion**: risky resolution rules that pick an attacker-controlled **high** version (or wrong registry) over an intended release.
- Practice detecting suspicious version skew and semver abuse in a project.
- Learn mitigations: **pin** versions, use lockfiles, verify registry scope, and block “latest wins” patterns for critical deps.

## Background

Attackers may publish a package under the same name with an **implausibly high** version or exploit resolver precedence so that `*` or loose ranges pull malware. Teams that rely on “highest semver wins” without registry controls are exposed—especially in split public/private registry setups (classic dependency confusion) or custom registries.

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

Start the mock server if needed:

```bash
node infrastructure/mock-server.js &
```

From `victim-app/`, run `npm start` to perform resolution/install and capture behavior.

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

## Expected Outcome

- The victim selects the attacker’s high version; evidence may show exfiltration when enabled.
- The detector warns on suspicious ranges, version jumps, or pinning gaps.

## Safety

Local simulation only; requires `TESTBENCH_MODE=enabled` for malicious branches.

---

Happy learning!
