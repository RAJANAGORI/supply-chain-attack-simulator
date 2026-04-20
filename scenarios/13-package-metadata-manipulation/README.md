# Scenario 13: Package Metadata Manipulation

- **Level**: Intermediate
- **Estimated Time**: 45-60 minutes
- **Primary Attack Surface**: Package metadata trust

## Learning Objectives

- Understand how package metadata can be manipulated to mislead consumers.
- Detect inconsistencies between package metadata and package contents.
- Apply defenses: metadata validation, SBOM comparison, and registry policy checks.

## Background

Package metadata (name, repository, homepage, maintainers, publish time) is often trusted by consumers and automated tools. Attackers can manipulate metadata (typos, spoofed repository URLs, fake maintainer fields, or altered tarball URLs) to hide malicious intent or to redirect package consumers to attacker-controlled resources.

## Threat Model Snapshot

- **Asset at risk**: package trust and downstream install pipeline
- **Trust edge abused**: registry/package metadata fields assumed accurate
- **Attacker objective**: hide malicious package behavior behind plausible metadata
- **Blast radius**: every consumer relying on unverified metadata

## Scenario Description

A widely used package (`clean-utils`) has had its metadata modified in a compromised publish: the `repository` points to a malicious mirror, the `author` is spoofed, and the tarball integrity fields do not match the actual package contents. Your tasks:

1. Red Team: craft a manipulated package metadata publish
2. Blue Team: detect mismatched metadata and tarball integrity
3. Security Team: implement defenses and incident response

## Lab Setup

Prerequisites: Node.js 16+, npm

Environment:

```bash
cd scenarios/13-package-metadata-manipulation
export TESTBENCH_MODE=enabled
./setup.sh
```

Start mock server in another terminal:

```bash
node infrastructure/mock-server.js
```

## Structure

- legitimate-packages/ - expected correct package metadata
- compromised-packages/ - manipulated package metadata + malicious payload
- victim-app/ - app depending on `clean-utils`
- infrastructure/ - mock attacker server and captured-data
- detection-tools/ - metadata-validator and SBOM checks
- `documentation/scenario-guides/` — quick reference and zero-to-hero guides (same tree as `docs/scenario-guides/` via symlink for GitHub Pages)

## Attack Walkthrough

1. Install the compromised package into `victim-app`.
2. Run the victim app with `TESTBENCH_MODE=enabled` to simulate exfiltration.
3. Inspect package metadata under `victim-app/node_modules/clean-utils/package.json`.
4. Run metadata validation and compare findings against expected publisher metadata.

## Detection Playbook

- **Static checks**
  - Repository URL mismatch from expected upstream
  - Author/maintainer mismatch from known-good metadata
  - Integrity field mismatch in `dist.integrity`
- **Behavioral checks**
  - Unexpected postinstall behavior
  - Mock-server capture events on port `3001`
- **Artifacts**
  - `infrastructure/captured-data.json`
  - detector output from `detection-tools/metadata-validator.js`

Run detector:

```bash
node detection-tools/metadata-validator.js victim-app/node_modules/clean-utils
```

## Mitigation Playbook

- Validate metadata against trusted allowlists for critical packages.
- Require lockfile and integrity verification in CI.
- Pin exact versions for sensitive dependencies.
- Mirror and sign internal-approved artifacts.

## Validation Checklist

- [ ] I reproduced the compromised behavior safely in testbench mode.
- [ ] I identified at least two metadata mismatches.
- [ ] I captured evidence from the mock server or logs.
- [ ] I documented production-ready prevention controls.

## Hints

- Run detector against installed package path, not only source package folders.
- If captures are empty, check `TESTBENCH_MODE` and ensure mock server is running on `3001`.
- Reset quickly with `../../scripts/kill-port.sh 3001`.

## Lab Report Prompts

- Which metadata field mismatch would have been easiest to catch in CI?
- What policy would prevent this from being silently consumed in enterprise builds?
- How should metadata validation and lockfile validation complement each other?

## Safety

All malicious behavior is gated by `TESTBENCH_MODE=enabled` and is local-only. Do not deploy to production.

---

Happy learning!
