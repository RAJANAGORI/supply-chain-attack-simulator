# Quick Reference — Scenario 17: Multi-Stage Attack Chain

- Goal: Correlate staged packages into kill-chain stages
- Setup: `cd scenarios/17-multi-stage-attack-chain && export TESTBENCH_MODE=enabled && ./setup.sh`
- Mock server: `node scenarios/17-multi-stage-attack-chain/infrastructure/mock-server.js` (port **3017**)
- Victim: `cd scenarios/17-multi-stage-attack-chain/victim-app && rm -rf node_modules package-lock.json && npm install ../packages/stage1-access-lib ../packages/stage2-compromised-lib && npm start`
- Evidence: `curl http://localhost:3017/captured-data` · `scenarios/17-multi-stage-attack-chain/infrastructure/captured-data.json`
- Detect: `node scenarios/17-multi-stage-attack-chain/detection-tools/multi-stage-correlator.js scenarios/17-multi-stage-attack-chain`
