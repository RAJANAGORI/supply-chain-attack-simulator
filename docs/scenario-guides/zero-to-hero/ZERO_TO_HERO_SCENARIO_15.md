# Zero-to-Hero — Scenario 15: Developer Tool Compromise

1. Overview: Install-time scripts in developer tools can exfiltrate secrets; `postinstall` is a common choke point.
2. Setup: `cd scenarios/15-developer-tool-compromise && export TESTBENCH_MODE=enabled && ./setup.sh`
3. Start mock attacker server: `node infrastructure/mock-server.js`
4. Install malicious tool into the victim app: `cd victim-app && rm -rf node_modules package-lock.json && npm install ../dev-tools/malicious-dev-tool && npm start`
5. Evidence: `http://localhost:3015/captured-data` and `infrastructure/captured-data.json`
6. Detect: `node detection-tools/dev-tool-compromise-detector.js victim-app` (from scenario root)
7. Response: pin tool versions, verify publisher, disable or audit install scripts in CI, use isolated dev containers.

Exercises:

- Add a CI step that lists all `postinstall` scripts in `node_modules` and fails on unknown publishers.
- Compare `dev-tools/legitimate-dev-tool` and `malicious-dev-tool` side by side and document three red flags.
