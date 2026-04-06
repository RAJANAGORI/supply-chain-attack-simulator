# Quick Reference — Scenario 16: Package Cache Poisoning

Use this as your runbook for Scenario 16 when you are teaching live or practicing quickly.
- Setup: `cd scenarios/16-package-cache-poisoning && export TESTBENCH_MODE=enabled && ./setup.sh`
- Mock server: `node scenarios/16-package-cache-poisoning/infrastructure/mock-server.js` (port **3016**)
- Victim: `cd scenarios/16-package-cache-poisoning/victim-app && rm -rf node_modules package-lock.json && npm install` (repeat once) · `npm start`
- Evidence: `curl http://localhost:3016/captured-data` · `scenarios/16-package-cache-poisoning/infrastructure/captured-data.json`
- Detect: `node scenarios/16-package-cache-poisoning/detection-tools/cache-poisoning-detector.js scenarios/16-package-cache-poisoning/victim-app`
