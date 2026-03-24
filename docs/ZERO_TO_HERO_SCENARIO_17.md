# Zero-to-Hero — Scenario 17: Multi-Stage Attack Chain

1. Overview: Supply chain attacks often span multiple steps; correlating evidence reveals the full story.
2. Setup: `cd scenarios/17-multi-stage-attack-chain && export TESTBENCH_MODE=enabled && ./setup.sh`
3. Start mock server: `node infrastructure/mock-server.js`
4. Install staged packages: `cd victim-app && rm -rf node_modules package-lock.json && npm install ../packages/stage1-access-lib ../packages/stage2-compromised-lib && npm start`
5. Evidence: `http://localhost:3017/captured-data` and `infrastructure/captured-data.json`
6. Detect: `node detection-tools/multi-stage-correlator.js .`
7. Response: break chains early (least privilege, token scoping), centralize logging, and rehearse multi-stage playbooks.

Exercises:

- Draw a sequence diagram of stage1 → stage2 → stage3 using filenames in this scenario as labels.
- Define one SIEM correlation rule that would fire only when two stages occur within a time window.
