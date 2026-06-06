# Quick Reference — Scenario 20: Package Version Confusion

Use this as your runbook for Scenario 20 when you are teaching live or practicing quickly.
- Setup: `cd scenarios/20-package-version-confusion && export TESTBENCH_MODE=enabled && ./setup.sh`
- Mock server: `node scenarios/20-package-version-confusion/infrastructure/mock-server.js` (port **3020**)
- Run: `cd scenarios/20-package-version-confusion/victim-app && npm start`
- Inspect: `scenarios/20-package-version-confusion/victim-app/installed-version.json` · versions under `scenarios/20-package-version-confusion/registry/`
- Evidence: `curl http://localhost:3020/captured-data` · `scenarios/20-package-version-confusion/infrastructure/captured-data.json`
- Detect: `node scenarios/20-package-version-confusion/detection-tools/version-confusion-detector.js scenarios/20-package-version-confusion/victim-app`
