# Scenario 21: Axios-style compromised npm release (simulation)

- **Level**: Advanced
- **Estimated Time**: 60-90 minutes
- **Primary Attack Surface**: Maintainer compromise and transitive lifecycle scripts

**Inspired by:** Maintainer-account takeover pattern discussed for npm (e.g. unexpected patch semver + transitive `postinstall`), as requested in [GitHub issue #3](https://github.com/RAJANAGORI/supply-chain-attack-simulator/issues/3). This lab uses **fictional** package names (`axios-like`, `plain-crypto-js-like`) and **localhost-only** telemetry—no real malware or external C2.

## Learning objectives

- See how a **trusted parent** can add an **unreferenced transitive** that still executes via **`postinstall`**.
- Practice **lockfile IOC** review and **lifecycle script** detection.
- Understand **anti-forensics** simulation: manifest swap to a decoy `package.json` after install.
- Relate to **semver caret** risk (`^1.14.0` pulling a poisoned `1.14.1` on real registries); here you model the upgrade with an explicit `npm install` of the malicious path version.

## Attack flow (testbench)

1. Victim depends on **clean** `axios-like@1.14.0` (no extra deps).
2. Attacker publishes **compromised** `axios-like@1.14.1` that **bundles** **`plain-crypto-js-like`** (`bundledDependencies`) so `npm install` of the packed release always materializes the transitive and runs **`postinstall`** (avoids “linked `file:` dep skips nested install” behavior).
3. `plain-crypto-js-like` **`postinstall`** (only when `TESTBENCH_MODE=enabled`): writes `.testbench-axios-ioc.json`, POSTs JSON to `http://localhost:3021/beacon`, then replaces its installed `package.json` with a decoy without `postinstall`.

## Threat Model Snapshot

- **Asset at risk**: dependency trust and developer/CI install pipeline
- **Trust edge abused**: compromised maintainer release introducing stealthy transitive code
- **Attacker objective**: run postinstall payload while minimizing visible manifest clues
- **Blast radius**: all consumers auto-updating to compromised patch version

## Setup

**Prerequisites:** Node.js 16+, npm

```bash
cd scenarios/21-axios-compromised-release-attack
export TESTBENCH_MODE=enabled
chmod +x setup.sh
./setup.sh
```

## Run the lab

### Terminal A - mock collector

```bash
node infrastructure/mock-server.js
```

### Terminal B - simulate installing the compromised patch

```bash
export TESTBENCH_MODE=enabled
cd victim-app
npm install axios-like@file:../packages/axios-like-1.14.1.tgz
npm start
```

### Inspect telemetry

```bash
curl -s http://localhost:3021/captured-data
cat victim-app/.testbench-axios-ioc.json
```

### Blue team

```bash
node detection-tools/axios-compromise-detector.js victim-app
```

Key indicators to capture:

- unexpected transitive with `postinstall` in lockfile/package tree
- marker artifact `.testbench-axios-ioc.json`
- capture data entries on `http://localhost:3021/captured-data`

## Containment, eradication, recovery (playbook)

1. **Contain:** stop CI runners / isolate dev machines that ran `npm install` with `TESTBENCH_MODE=enabled` against the bad version.
2. **Eradicate:** remove `node_modules`, delete lockfile or regenerate from a known-good manifest; revoke **npm tokens** and rotate CI secrets (real incidents—here, only mock markers).
3. **Recover:** pin **`axios-like` to `1.14.0`** (or exact commit / verified tarball); enforce **lockfile-only** installs in CI; enable **provenance / trusted publishing** checks where available.
4. **Hunt:** search org lockfiles for `plain-crypto-js-like` (or real IOC names from advisories).

## Validation Checklist

- [ ] I reproduced the compromised patch install path safely.
- [ ] I captured both lockfile/script and runtime beacon indicators.
- [ ] I ran detector output against victim app and validated findings.
- [ ] I documented a CI gate design to block this class of compromise.

## Hints

- Use the packed `axios-like-1.14.1.tgz` path from setup to ensure bundled dependency behavior.
- If no captures appear, verify mock server on `3021` and `TESTBENCH_MODE=enabled`.
- Reset quickly with `../../scripts/kill-port.sh 3021`.

## Lab Report Prompts

- Which control is strongest here: trusted publishing, lockfile policy, or script blocking?
- How should teams triage patch-version updates for high-download packages?
- What anti-forensics behavior was present, and how can detection resist it?

## CI-safe and offline modes

- **No network:** all traffic is to `127.0.0.1:3021`.
- **Offline install (skip beacon):** `TESTBENCH_OFFLINE=1 npm install axios-like@file:../packages/axios-like-1.14.1.tgz` — postinstall exits early (marker file still written unless you extend the script).

## References (real world)

- [axios/axios incident discussion](https://github.com/axios/axios/issues/10604) (external)
- Community write-ups linked from [issue #3](https://github.com/RAJANAGORI/supply-chain-attack-simulator/issues/3)

## Safety

Educational testbench only. Do not point payloads at non-localhost endpoints.
