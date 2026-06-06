# Quick Reference — Scenario 21: Axios-style compromised npm release

Use this as your runbook for Scenario 21 when you are teaching live or practicing quickly.

- Setup: `cd scenarios/21-axios-compromised-release-attack && export TESTBENCH_MODE=enabled && ./setup.sh`
- Mock server: `node scenarios/21-axios-compromised-release-attack/infrastructure/mock-server.js` (port **3021**)
- Malicious upgrade: `cd scenarios/21-axios-compromised-release-attack/victim-app && export TESTBENCH_MODE=enabled && npm install axios-like@file:../packages/axios-like-1.14.1.tgz`
- Run victim: `npm start`
- Evidence: `curl -s http://localhost:3021/captured-data` · `victim-app/.testbench-axios-ioc.json` · `infrastructure/captured-data.json`
- Detect: `node scenarios/21-axios-compromised-release-attack/detection-tools/axios-compromise-detector.js scenarios/21-axios-compromised-release-attack/victim-app`
- Port cleanup: `sudo ./scripts/kill-port.sh 3021`
