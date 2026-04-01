# Quick Reference — Scenario 18: Package Manager Plugin Attack

Use this as your runbook for Scenario 18 when you are teaching live or practicing quickly.
- Setup: `cd scenarios/18-package-manager-plugin-attack && export TESTBENCH_MODE=enabled && ./setup.sh`
- Mock server: `node scenarios/18-package-manager-plugin-attack/infrastructure/mock-server.js` (port **3018**)
- Victim: `cd scenarios/18-package-manager-plugin-attack/victim-app && rm -rf node_modules && npm start`
- Evidence: `curl http://localhost:3018/captured-data` · `scenarios/18-package-manager-plugin-attack/infrastructure/captured-data.json`
- Detect: `node scenarios/18-package-manager-plugin-attack/detection-tools/plugin-attack-detector.js scenarios/18-package-manager-plugin-attack/victim-app`
