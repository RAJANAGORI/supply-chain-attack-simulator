# Zero to Hero — Quick Beginner Guide

This guide gets a newcomer from zero to running their first scenario and understanding the testbench safety controls.

1) Prerequisites
   - Node.js 16+, npm
   - Python 3.8+ (some helpers)
   - Docker (optional for container scenarios)
   - Git

2) Clone and setup

   ```bash
   git clone <repository-url>
   cd supply-chain-attack-simulator
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

3) Safety first
   - All "malicious" actions require `TESTBENCH_MODE=enabled`.
   - Mock exfiltration endpoints use `localhost`.
   - Do not run these labs on production or public networks.

4) Run your first scenario (example: Transitive Dependency)

   ```bash
   cd scenarios/07-transitive-dependency
   export TESTBENCH_MODE=enabled
   ./setup.sh
   # start mock server (separate terminal)
   node infrastructure/mock-server.js
   # run victim steps
   cd victim-app
   npm install
   # follow README steps for detection & response
   ```

5) Learn effectively
   - Start with scenarios 1-3 to learn basic vectors.
   - Move to intermediate (7-8, 10-12, 13) for real-world cases.
   - Advanced scenarios (9, 11, 14) require understanding of cryptography, registries, or container tooling.
   - Use detection-tools/ and generate SBOMs (`npm ls --json > sbom.json`) to practice verification.

6) Contribute
   - Add scenarios under `scenarios/` following existing structure:
     - `legitimate-packages/`, `compromised-packages/`, `victim-app/`, `infrastructure/`, `detection-tools/`, `templates/`
   - Add `README.md`, `setup.sh`, quick-reference doc, and a zero-to-hero doc for each new scenario.

7) Troubleshooting
   - If a mock server doesn't start, check ports in `infrastructure/mock-server.js`.
   - If installs don't trigger postinstall scripts, ensure `TESTBENCH_MODE=enabled` is exported.

Enjoy learning and please use these labs responsibly.
