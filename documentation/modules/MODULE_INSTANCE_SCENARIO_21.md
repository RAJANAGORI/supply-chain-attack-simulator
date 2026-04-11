# Module Instance: Scenario 21 (Axios-style compromised npm release)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This scenario teaches how a **maintainer-published patch** can introduce an **unreferenced transitive** that still runs **`postinstall`**, with optional **manifest decoy** behavior—using fictional packages and **localhost-only** beacons. See [GitHub issue #3](https://github.com/RAJANAGORI/supply-chain-attack-simulator/issues/3).

## 1) Module Card

- **Module ID**: `21`
- **Title**: `Axios-style compromised npm release (simulation)`
- **Level**: `Advanced`
- **Estimated Time**: `45-75 minutes`
- **Primary Attack Surface**: `npm lifecycle scripts, lockfile trust, transitive dependencies`
- **Prerequisites**: npm basics, `package.json` / lockfile literacy, Scenario 03 or 07 helpful but not required

## 2) Learning Objectives

- Explain how a parent package can add a transitive that **never appears in application source** but still executes at install time.
- Reproduce **postinstall** beacons and **IOC markers** gated by `TESTBENCH_MODE`.
- Interpret **`INIT_CWD`** for lifecycle script output placement vs `process.cwd()` in nested installs.
- Practice lockfile review for unexpected package names and `postinstall` governance.

## 3) Threat Model Snapshot

- **Asset at risk**: developer workstations, CI install jobs, artifact reproducibility
- **Trust edge abused**: registry semver + implicit trust in **install scripts**
- **Attacker objective**: execute code during `npm install`, persist plausible deniability (decoy manifest)
- **Blast radius**: every environment that installs the compromised version range

## 4) Lab Setup

```bash
cd scenarios/21-axios-compromised-release-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

Start mock server (separate terminal): `node infrastructure/mock-server.js` (port **3021**).

## 5) Attack Walkthrough

1. Victim starts on clean **`axios-like@1.14.0`** (no extra deps).
2. Upgrade to packed **`axios-like@1.14.1`** with **bundled** `plain-crypto-js-like`:  
   `npm install axios-like@file:../packages/axios-like-1.14.1.tgz`
3. Observe **`postinstall`**: marker file, **POST `/beacon`**, decoy `package.json` swap in `node_modules`.
4. Run victim app: `npm start` (parent never `require()`s the transitive).

## 6) Detection Playbook

- **Static checks**: `package-lock.json` / `npm ls` for unexpected packages; diff lock across builds.
- **Behavioral checks**: outbound to **`127.0.0.1:3021`** in lab; in production, monitor install-time network.
- **Evidence artifacts**: `.testbench-axios-ioc.json`, `infrastructure/captured-data.json`, detector stdout.

```bash
node detection-tools/axios-compromise-detector.js victim-app
```

## 7) Mitigation Playbook

- Pin **exact** versions or verified tarballs; require lockfile-only CI installs.
- Use **`npm audit`**, org policies on **`ignore-scripts`**, and provenance / trusted publishing where available.
- After suspected compromise: rotate **npm tokens** and CI secrets; rebuild clean `node_modules`.

## 8) Validation Checklist (Success Criteria)

- [ ] Malicious patch install reproduces beacon and marker when `TESTBENCH_MODE=enabled`.
- [ ] Detector flags lockfile / marker / beacon log as expected.
- [ ] Learner can articulate difference between **import-time** and **install-time** execution.

## 9) Production Policy Snippet

```bash
# Example: fail CI on unexpected lifecycle-heavy packages (org-specific allowlist)
npm ls --all --json | node scripts/check-disallowed-scripts.js
```

## 10) Debrief Questions

- Why can **`file:`** linked dependencies skip nested installs, and how does **bundling** change that?
- What role does **`INIT_CWD`** play in forensic artifact location for lifecycle scripts?
- Where would you enforce **postinstall** policy: developer laptop, CI, or both?
