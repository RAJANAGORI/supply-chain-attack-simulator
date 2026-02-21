# Zero-to-Hero — Scenario 13: Package Metadata Manipulation

1. Overview: Metadata controls trust; attackers can spoof repository, author, and integrity fields.
2. Setup: `cd scenarios/13-package-metadata-manipulation && export TESTBENCH_MODE=enabled && ./setup.sh`
3. Start mock attacker server: `node infrastructure/mock-server.js`
4. Install victim deps: `cd victim-app && npm install`
5. Simulate compromise: `cp -r ../compromised-packages/clean-utils node_modules/clean-utils && npm install`
6. Detect: `node ../detection-tools/metadata-validator.js node_modules/clean-utils`
7. Response: pin versions, verify registry source, run SBOM, block malicious mirrors, rotate credentials.

Exercises:
- Implement a CI gate that validates package metadata against a trusted allowlist.
- Create SBOM-based verification comparing expected tarball checksums to local cache.

