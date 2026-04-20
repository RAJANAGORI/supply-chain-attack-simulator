# Scenario 19: SBOM Manipulation Attack

- **Level**: Advanced
- **Estimated Time**: 45-60 minutes
- **Primary Attack Surface**: SBOM generation and verification trust

## Learning Objectives

- Understand why **SBOMs** are only useful when they faithfully represent what is installed and executed.
- Practice detecting **omissions** and **mismatches** between an SBOM and ground-truth dependencies.
- Learn mitigations: regenerate SBOMs from lockfiles, sign artifacts, cross-check in CI, and monitor for drift.

## Background

Software Bills of Materials (SBOMs) support compliance and incident response. If an attacker or buggy pipeline **drops** malicious packages from the SBOM, consumers may trust a false inventory. Verification must compare SBOM claims to reproducible sources of truth (lockfiles, hashes, build provenance).

## Threat Model Snapshot

- **Asset at risk**: software inventory integrity and compliance posture
- **Trust edge abused**: SBOM output accepted without cross-validation
- **Attacker objective**: hide risky dependencies from review and policy controls
- **Blast radius**: downstream teams relying on manipulated SBOM for risk decisions

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

Key indicators to capture:

- Dependencies present in runtime/lockfile but absent from `sbom.json`
- Inconsistencies between `truth/dependencies.json` and generated SBOM
- Mock-server capture artifacts on `3019`

## Mitigation Playbook

- Regenerate SBOM from lockfile/build artifacts in trusted CI only.
- Require SBOM signing and provenance attestation.
- Enforce fail-closed CI policy for SBOM-lockfile mismatches.
- Keep "truth source" and SBOM generation steps isolated from app code tampering.
- Periodically diff production SBOM against runtime inventory scans.

## Expected Outcome

- The validator reports missing or inconsistent dependencies relative to truth data.
- You can articulate how CI would fail a build when SBOM and lockfile disagree.

## Validation Checklist

- [ ] I generated and inspected the manipulated SBOM.
- [ ] I identified at least one omitted or inconsistent dependency.
- [ ] I ran the validator and captured evidence.
- [ ] I documented CI policy checks to prevent SBOM tampering.

## Hints

- Compare `victim-app/sbom.json` with `truth/dependencies.json` first, then run detector.
- If no captures appear, verify mock server on `3019`.
- Use `../../scripts/kill-port.sh 3019` for cleanup.

## Lab Report Prompts

- What should be the canonical source-of-truth: lockfile, SBOM, or both?
- Which CI control prevents silent omission most effectively?
- How should incident response treat discovered SBOM drift in production?

## Safety

Testbench-gated behavior; localhost-only collection.

---

Happy learning!
