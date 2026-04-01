# Zero-to-Hero — Scenario 20: Package Version Confusion

1. Overview: Loose semver ranges or “highest version wins” can pull attacker-controlled releases from the wrong registry or a typosquat.
2. Setup: `cd scenarios/20-package-version-confusion && export TESTBENCH_MODE=enabled && ./setup.sh`
3. Start mock server: `node infrastructure/mock-server.js`
4. Run victim resolution/install: `cd victim-app && npm start`
5. Inspect: `victim-app/installed-version.json` and `registry/` layout for version skew
6. Evidence: `http://localhost:3020/captured-data` and `infrastructure/captured-data.json`
7. Detect: `node detection-tools/version-confusion-detector.js victim-app`
8. Response: pin exact versions, enforce lockfiles, use private scopes and registry firewall rules, block absurd semver jumps in CI.

Exercises:

- Rewrite one `package.json` dependency from `*` to an exact pinned version and explain the tradeoff.
- Describe how dependency confusion (public vs private) differs from this lab’s “highest local version” simulation.
