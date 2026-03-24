# Scenario 19: SBOM Manipulation Attack

## Learning Objectives

- Understand why **SBOMs** are only useful when they faithfully represent what is installed and executed.
- Practice detecting **omissions** and **mismatches** between an SBOM and ground-truth dependencies.
- Learn mitigations: regenerate SBOMs from lockfiles, sign artifacts, cross-check in CI, and monitor for drift.

## Background

Software Bills of Materials (SBOMs) support compliance and incident response. If an attacker or buggy pipeline **drops** malicious packages from the SBOM, consumers may trust a false inventory. Verification must compare SBOM claims to reproducible sources of truth (lockfiles, hashes, build provenance).

## Scenario Description

The victim runs a **malicious SBOM generator** that writes `victim-app/sbom.json` and **omits** a sensitive dependency (`malicious-lib`). When `TESTBENCH_MODE=enabled`, the generator also emits evidence to the mock server. Ground-truth inputs live under `truth/`. Your tasks:

1. **Red team**: Compare `sbom.json` to actual installs.
2. **Blue team**: Use `truth/dependencies.json` (or equivalent) as the oracle.
3. **Defender**: Run the validator and document what a CI gate should enforce.

## Setup

**Prerequisites:** Node.js 16+, npm

**Environment:**

```bash
cd scenarios/19-sbom-manipulation-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

Start the mock server if needed:

```bash
node infrastructure/mock-server.js &
```

From `victim-app/`, run `npm start` to generate the SBOM (and optional exfiltration).

## Structure

- `truth/` — reference dependency truth (`dependencies.json`)
- `sbom/` — malicious SBOM generator script
- `victim-app/` — consumes generator output (`sbom.json`)
- `infrastructure/` — mock server (port **3019**), `captured-data.json`
- `detection-tools/` — `sbom-manipulation-validator.js`

## Evidence

- `http://localhost:3019/captured-data`
- `infrastructure/captured-data.json`
- Generated: `victim-app/sbom.json`

## Detection

From the scenario root:

```bash
node detection-tools/sbom-manipulation-validator.js victim-app
```

## Expected Outcome

- The validator reports missing or inconsistent dependencies relative to truth data.
- You can articulate how CI would fail a build when SBOM and lockfile disagree.

## Safety

Testbench-gated behavior; localhost-only collection.

---

Happy learning!
