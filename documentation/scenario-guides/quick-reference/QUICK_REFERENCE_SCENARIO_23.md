# Quick Reference — Scenario 23: Trivy Supply Chain Attack (CVE-2026-33634)

Use this as your runbook for Scenario 23 when you are teaching live or practicing quickly.





## Table of Contents

<div class="doc-toc">

- [Setup](#setup)
- [Mock C2 server](#mock-c2-server)
- [Run victim CI pipeline](#run-victim-ci-pipeline)
- [Evidence](#evidence)
- [Detect](#detect)
- [Port cleanup](#port-cleanup)

</div>

---
## Setup

`cd scenarios/23-trivy-supply-chain-attack && export TESTBENCH_MODE=enabled && ./setup.sh`

## Mock C2 server

`node scenarios/23-trivy-supply-chain-attack/infrastructure/mock-c2-server.js` (port **3023**)

## Run victim CI pipeline

`cd scenarios/23-trivy-supply-chain-attack/victim-ci && export TESTBENCH_MODE=enabled && node run-pipeline.js`

Optional — set fake CI secrets to see them harvested:

`export GITHUB_TOKEN=ghp_FAKE_FOR_LAB && export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE && node run-pipeline.js`

## Evidence

`curl -s http://127.0.0.1:3023/captured-data` · `infrastructure/captured-data.json`

## Detect

```bash
node scenarios/23-trivy-supply-chain-attack/detection-tools/trivy-version-scanner.js \
     scenarios/23-trivy-supply-chain-attack/victim-ci

node scenarios/23-trivy-supply-chain-attack/detection-tools/ci-workflow-auditor.js \
     scenarios/23-trivy-supply-chain-attack/victim-ci
```

## Port cleanup

`./scripts/kill-port.sh 3023`
