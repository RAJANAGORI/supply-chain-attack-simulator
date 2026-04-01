# Zero-to-Hero — Scenario 14: Container Image Supply Chain Attack

1. Overview: Image layers can hide malicious code that executes at build or runtime.
2. Setup: `cd scenarios/14-container-image-supply-chain-attack && export TESTBENCH_MODE=enabled && ./setup.sh`
3. Start mock attacker server: `node infrastructure/mock-server.js`
4. Build & run compromised image (local only):
   - `docker build -t compromised-image images/compromised-image`
   - `docker run --rm -e TESTBENCH_MODE=enabled --add-host=host.docker.internal:host-gateway compromised-image`
5. Detect:
   - Static scan: `node detection-tools/image-scanner.js images/compromised-image`
   - Runtime: monitor mock server at `http://localhost:3002/captured-data`
6. Response: use image signing (notary/cosign), provenance verification, immutable tags, vulnerability scanning, and strict CI/CD policies.

Exercises:
- Implement a CI check that verifies image signatures before deployment.
- Create an image diff tool that compares layers between a trusted and suspect image.

