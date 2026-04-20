# Scenario 14: Container Image Supply Chain Attack

- **Level**: Advanced
- **Estimated Time**: 45-60 minutes
- **Primary Attack Surface**: Container image build/runtime trust

## Learning Objectives

By the end of this lab, you should be able to:

- Explain how malicious image changes survive normal pull/build workflows.
- Detect suspicious container startup behavior from static artifacts and runtime evidence.
- Propose layered defenses: image provenance, signing, policy gates, and runtime controls.

## Background

Container security is often treated as "scan image for CVEs and ship." Supply chain attacks in containers abuse **trust in image content**: attacker-modified files, altered entrypoints, hidden startup scripts, or unauthorized network beacons. If teams rely only on tag names or superficial scans, compromised images can pass into production.

This scenario demonstrates the pattern safely:

- All malicious behavior requires `TESTBENCH_MODE=enabled`.
- Exfiltration is localhost-only to a mock endpoint (`127.0.0.1:3002`).
- No public registry publishing is required.

## Threat Model Snapshot

- **Asset at risk**: secrets and host metadata available to runtime containers
- **Trust edge abused**: trust in image contents/entrypoint from an expected tag
- **Attacker objective**: run hidden startup code and beacon data
- **Blast radius**: any environment pulling the compromised image definition

## Lab Setup

```bash
cd scenarios/14-container-image-supply-chain-attack
export TESTBENCH_MODE=enabled
./setup.sh
```

In another terminal:

```bash
node infrastructure/mock-server.js
```

## Attack Walkthrough

1. **Recon**: Compare `images/legitimate-image/Dockerfile` and `images/compromised-image/Dockerfile`.
2. **Exploit (static)**: Run scanner against compromised image definition.
3. **Exploit (runtime simulation)**: Execute compromised startup script with testbench mode on.
4. **Observe impact**: confirm mock capture on port `3002`.

## Lab Tasks

### Task 1: Static detection

```bash
node detection-tools/image-scanner.js images/compromised-image
```

Expected: non-zero exit and findings such as known malicious entrypoint or suspicious network behavior.

### Task 2: Runtime evidence capture (without Docker)

```bash
TESTBENCH_MODE=enabled node images/compromised-image/malicious-start.js
curl -s http://127.0.0.1:3002/captured-data
```

Expected: at least one capture event in `infrastructure/captured-data.json`.

### Task 3: Optional Docker validation

If Docker is available:

```bash
docker build -t scas-legit images/legitimate-image
docker build -t scas-compromised images/compromised-image
docker run --rm -e TESTBENCH_MODE=enabled scas-compromised
```

Note: this scenario is valid without Docker; scanner + runtime script already model the attack.

## Detection Playbook

- **Static checks**
  - Entrypoint/CMD drift from expected baseline
  - Unexpected outbound network operations in startup chain
  - References to host bridge surfaces (for example `host.docker.internal`)
- **Behavioral checks**
  - Unexpected HTTP POSTs at container startup
  - Runtime beacons without explicit app behavior
- **Artifacts**
  - `infrastructure/captured-data.json`
  - Scanner output from `detection-tools/image-scanner.js`

## Mitigation Playbook

- Enforce image provenance and signature verification in CI/CD.
- Pin immutable image digests (not mutable tags only).
- Add policy checks for entrypoint/CMD changes on critical images.
- Restrict outbound network from build and runtime where possible.
- Require reproducible image builds and signed attestations.

## Validation Checklist

- [ ] I reproduced the compromise behavior in testbench mode.
- [ ] I captured at least two indicators (static + runtime).
- [ ] I documented at least three mitigations suitable for production.
- [ ] I can explain where trust failed in the image pipeline.

## Hints

- Start with static comparison and scanner output before runtime.
- If no capture appears, confirm `TESTBENCH_MODE=enabled` and mock server is running on port `3002`.
- Use `../../scripts/kill-port.sh 3002` if the mock server port is busy.

## Lab Report Prompts

- Which signal was fastest to detect compromise: Dockerfile diff, scanner rule, or runtime beacon?
- What CI gate would have blocked this earliest?
- How would you separate "image vulnerability scanning" from "image trust verification" in policy?

## Safety

This scenario is educational and local-only. Do not push compromised images to public registries or non-lab systems.
