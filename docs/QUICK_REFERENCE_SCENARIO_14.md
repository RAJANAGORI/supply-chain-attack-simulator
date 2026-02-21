# Quick Reference — Scenario 14: Container Image Supply Chain Attack

- Goal: Detect malicious layers or startup exfiltration in container images
- Start mock server: `node scenarios/14-container-image-supply-chain-attack/infrastructure/mock-server.js`
- Build legitimate image: `docker build -t legit-image scenarios/14-container-image-supply-chain-attack/images/legitimate-image`
- Build compromised image: `docker build -t compromised-image scenarios/14-container-image-supply-chain-attack/images/compromised-image`
- Run compromised image with TESTBENCH_MODE: `docker run --rm -e TESTBENCH_MODE=enabled --add-host=host.docker.internal:host-gateway compromised-image`
- Scan Dockerfile: `node scenarios/14-container-image-supply-chain-attack/detection-tools/image-scanner.js scenarios/14-container-image-supply-chain-attack/images/compromised-image`

