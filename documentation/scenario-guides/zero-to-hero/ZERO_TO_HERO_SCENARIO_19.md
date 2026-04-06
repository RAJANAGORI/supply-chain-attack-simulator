# Zero-to-Hero — Scenario 19: SBOM Manipulation Attack

1. Overview: An SBOM that omits malicious dependencies creates false assurance; verify against lockfiles and builds.
2. Setup: `cd scenarios/19-sbom-manipulation-attack && export TESTBENCH_MODE=enabled && ./setup.sh`
3. Start mock server: `node infrastructure/mock-server.js`
4. Generate SBOM (simulated): `cd victim-app && npm start`
5. Compare truth vs SBOM: read `truth/dependencies.json` and `victim-app/sbom.json`
6. Detect: `node detection-tools/sbom-manipulation-validator.js victim-app`
7. Response: generate SBOM from reproducible inputs, sign SBOMs, fail CI on mismatch, and store attestations with releases.

Exercises:

- Write a one-paragraph SBOM acceptance policy for your org (inputs, tooling, failure modes).
- Automate: `npm ls --json` vs `sbom.json` diff — outline the steps without implementing.
