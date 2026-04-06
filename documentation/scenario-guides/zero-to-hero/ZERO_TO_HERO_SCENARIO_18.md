# Zero-to-Hero — Scenario 18: Package Manager Plugin Attack

1. Overview: Plugins that hook installs can modify dependencies or exfiltrate; treat them as high-risk code.
2. Setup: `cd scenarios/18-package-manager-plugin-attack && export TESTBENCH_MODE=enabled && ./setup.sh`
3. Start mock server: `node infrastructure/mock-server.js`
4. Run victim: `cd victim-app && rm -rf node_modules && npm start`
5. Evidence: `http://localhost:3018/captured-data` and `infrastructure/captured-data.json`
6. Detect: `node detection-tools/plugin-attack-detector.js victim-app`
7. Response: allowlist plugins, code-review hook implementations, run installs in ephemeral CI, and verify `node_modules` with checksum or policy tools.

Exercises:

- List which files under `victim-app` or `packages/` change when the malicious plugin runs and why.
- Propose a policy: “plugins may only load from internal registry X” with enforcement ideas.
