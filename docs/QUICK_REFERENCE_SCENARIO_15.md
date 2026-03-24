# Quick Reference — Scenario 15: Developer Tool Compromise

- Goal: See how a compromised dev tool’s install scripts can exfiltrate when `TESTBENCH_MODE=enabled`
- Setup: `cd scenarios/15-developer-tool-compromise && export TESTBENCH_MODE=enabled && ./setup.sh`
- Mock server: `node scenarios/15-developer-tool-compromise/infrastructure/mock-server.js` (port **3015**)
- Attack path: `cd scenarios/15-developer-tool-compromise/victim-app && rm -rf node_modules package-lock.json && npm install ../dev-tools/malicious-dev-tool && npm start`
- Evidence: `curl http://localhost:3015/captured-data` · file: `scenarios/15-developer-tool-compromise/infrastructure/captured-data.json`
- Detect: `node scenarios/15-developer-tool-compromise/detection-tools/dev-tool-compromise-detector.js scenarios/15-developer-tool-compromise/victim-app`
