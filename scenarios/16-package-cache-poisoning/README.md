# Scenario 16: Package Cache Poisoning

- **Level**: Intermediate
- **Estimated Time**: 45-60 minutes
- **Primary Attack Surface**: Package cache integrity

## Learning Objectives

- Understand how a **poisoned local cache** can reinstall the same bad artifact even after upstream fixes.
- Practice detecting cache-related indicators (unexpected payloads, tampered tarballs, suspicious `postinstall` behavior).
- Learn mitigations: clear caches, verify integrity, reproducible installs, and CI cache hygiene.

## Background

Package managers cache downloads to speed up installs. If an attacker or bug writes a **malicious copy** into that cache (or a mirror serves bad content once), subsequent installs may keep pulling the poisoned bits until the cache is invalidated. Defenders must treat “clean `package.json`” as insufficient when the cache layer is untrusted.

## Threat Model Snapshot

- **Asset at risk**: dependency integrity across repeated installs
- **Trust edge abused**: local cache entries treated as trusted source-of-truth
- **Attacker objective**: persistence through reinstall workflows even after upstream fixes
- **Blast radius**: any project sharing poisoned cache state

## Scenario Description

This lab uses a **local cache folder** simulation: during `npm install`, the victim flow copies a cached module into `node_modules` and loads it. Because the cached artifact is already poisoned, **reinstalls repeat the compromise**. When `TESTBENCH_MODE=enabled`, the poisoned module exfiltrates to the mock server. Your tasks:

1. **Red team**: Observe persistence across repeated `npm install` cycles.
2. **Blue team**: Inspect cache paths and loaded code.
3. **Defender**: Run the detector and apply its remediation hints.

## Setup

**Prerequisites:** Node.js 16+, npm

**Environment:**

```bash
cd scenarios/16-package-cache-poisoning
export TESTBENCH_MODE=enabled
./setup.sh
```

Optional: start the mock server manually.

```bash
node infrastructure/mock-server.js &
```

Then from `victim-app/`: run `npm install`, optionally repeat reinstall per `setup.sh`, then `npm start`.

## Structure

- `cache/` — simulated cache contents (legitimate vs poisoned layouts)
- `victim-app/` — app that installs from cache / triggers load
- `infrastructure/` — mock server (port **3016**), `captured-data.json`
- `detection-tools/` — `cache-poisoning-detector.js`

## Evidence

- `http://localhost:3016/captured-data`
- `infrastructure/captured-data.json`

## Detection

From the scenario directory (or `victim-app` with adjusted path as in `setup.sh`):

```bash
node detection-tools/cache-poisoning-detector.js victim-app
```

Key indicators to capture:

- Repeated compromise behavior after deleting only `node_modules`
- Unexpected code origin from cache path instead of trusted registry fetch
- Mock server evidence in `infrastructure/captured-data.json`

## Mitigation Playbook

- Clear/rotate package cache during incident response and critical pipeline runs.
- Enforce lockfile + integrity verification against trusted metadata.
- Use deterministic installs in CI (`npm ci`) and immutable artifact mirrors.
- Monitor for suspicious cache path mutations and postinstall behavior.
- Separate developer cache trust from production build trust boundaries.

## Expected Outcome

- Capture entries show exfiltration from the poisoned cached module when the testbench flag is enabled.
- The detector highlights suspicious patterns in cache-sourced code and suggests clearing or validating the cache.

## Validation Checklist

- [ ] I reproduced persistent compromise across reinstall cycles.
- [ ] I captured both runtime and static indicators.
- [ ] I validated detector output against observed behavior.
- [ ] I documented concrete cache-hardening controls for CI and developer machines.

## Hints

- Run at least two install cycles to prove persistence behavior.
- If no captures appear, verify mock server on `3016` and `TESTBENCH_MODE=enabled`.
- Use `../../scripts/kill-port.sh 3016` for fast cleanup.

## Lab Report Prompts

- What evidence proved cache persistence most convincingly?
- Which control should be mandatory after a registry incident: cache purge, lockfile refresh, or both?
- How would you detect poisoned caches proactively in enterprise fleets?

## Safety

Exfiltration is localhost-only and requires `TESTBENCH_MODE=enabled`.

---

Happy learning!
