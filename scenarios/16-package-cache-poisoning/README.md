# Scenario 16: Package Cache Poisoning

## Learning Objectives

- Understand how a **poisoned local cache** can reinstall the same bad artifact even after upstream fixes.
- Practice detecting cache-related indicators (unexpected payloads, tampered tarballs, suspicious `postinstall` behavior).
- Learn mitigations: clear caches, verify integrity, reproducible installs, and CI cache hygiene.

## Background

Package managers cache downloads to speed up installs. If an attacker or bug writes a **malicious copy** into that cache (or a mirror serves bad content once), subsequent installs may keep pulling the poisoned bits until the cache is invalidated. Defenders must treat “clean `package.json`” as insufficient when the cache layer is untrusted.

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

## Expected Outcome

- Capture entries show exfiltration from the poisoned cached module when the testbench flag is enabled.
- The detector highlights suspicious patterns in cache-sourced code and suggests clearing or validating the cache.

## Safety

Exfiltration is localhost-only and requires `TESTBENCH_MODE=enabled`.

---

Happy learning!
