# Zero-to-Hero — Scenario 16: Package Cache Poisoning

1. Overview: A poisoned local cache can reinstall bad artifacts until the cache is cleared or validated.
2. Setup: `cd scenarios/16-package-cache-poisoning && export TESTBENCH_MODE=enabled && ./setup.sh`
3. Start mock server: `node infrastructure/mock-server.js`
4. Trigger install + persistence: `cd victim-app && rm -rf node_modules package-lock.json && npm install` (repeat once to show persistence), then `npm start`
5. Evidence: `http://localhost:3016/captured-data` and `infrastructure/captured-data.json`
6. Detect: `node detection-tools/cache-poisoning-detector.js victim-app`
7. Response: purge package cache, enforce checksum verification, use clean CI runners, and compare cache hashes to registry metadata.

Exercises:

- Script a “cache bust” command for your team’s package manager and document when to run it after an incident.
- List two signals that distinguish “slow network” from “poisoned cache” during triage.
