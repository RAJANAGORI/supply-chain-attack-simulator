# Quick Reference — Scenario 19: SBOM Manipulation Attack

- Goal: SBOM omits malicious dependency; validate against ground truth
- Setup: `cd scenarios/19-sbom-manipulation-attack && export TESTBENCH_MODE=enabled && ./setup.sh`
- Mock server: `node scenarios/19-sbom-manipulation-attack/infrastructure/mock-server.js` (port **3019**)
- Generate: `cd scenarios/19-sbom-manipulation-attack/victim-app && npm start`
- Truth vs output: `scenarios/19-sbom-manipulation-attack/truth/dependencies.json` · `scenarios/19-sbom-manipulation-attack/victim-app/sbom.json`
- Evidence: `curl http://localhost:3019/captured-data` · `scenarios/19-sbom-manipulation-attack/infrastructure/captured-data.json`
- Detect: `node scenarios/19-sbom-manipulation-attack/detection-tools/sbom-manipulation-validator.js scenarios/19-sbom-manipulation-attack/victim-app`
