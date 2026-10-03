# First lab in 10 minutes (Zero to Hero)

> **Which "Zero to Hero" is this?** This is the short hands-on start: clone, set up, run a first scenario.
> - Conceptual curriculum (trust-edge model, staged learning) → [Curriculum overview](../learning-path/SUPPLY_CHAIN_ATTACKS_ZERO_TO_HERO.md)
> - All 25 step-by-step walkthroughs → [Zero-to-hero walkthroughs](../scenario-guides/zero-to-hero/index.md)

From zero to a running lab, with the safety controls in mind.

1) Prerequisites
   - Node.js 16+, npm
   - Python 3.8+ (some helpers)
   - Git

2) Clone and setup

   ```bash
   git clone https://github.com/RAJANAGORI/supply-chain-attack-simulator.git
   cd supply-chain-attack-simulator
   chmod +x START_HERE.sh
   ./START_HERE.sh
   source .scas.env
   ```

   No flags: a three-way menu (labs only, workshop stack, Docker labs). Same binary as `./install.sh`. Docker path: [DOCKER_LABS.md](./DOCKER_LABS.md).

3) Safety first
   - Malicious paths need `TESTBENCH_MODE=enabled`.
   - Mock exfiltration endpoints use `localhost`.
   - Do not run these labs on production or public networks.

4) Run a first scenario (example: Transitive Dependency)

   ```bash
   cd scenarios/07-transitive-dependency
   export TESTBENCH_MODE=enabled
   ./setup.sh
   # start mock server (separate terminal)
   node infrastructure/mock-server.js
   # run victim steps
   cd victim-app
   npm install
   # follow README steps for detection & response
   ```

   Prefer starting at typosquatting? Use [Scenario 01](../../scenarios/01-typosquatting/README.md) or the [Scenario 01 walkthrough](../scenario-guides/zero-to-hero/ZERO_TO_HERO_SCENARIO_01.md).

5) How to move through the labs
   - Start with scenarios 1-3 for the basic vectors.
   - Intermediate (7-8, 10-12, 13) for more realistic cases.
   - Advanced (9, 11, 14, ...) need more crypto, registry, or container background.
   - Use `detection-tools/` and SBOMs (`npm ls --json > sbom.json`) when you practice verification.

6) Contribute
   - Add scenarios under `scenarios/` following the usual layout:
     - `legitimate-packages/`, `compromised-packages/`, `victim-app/`, `infrastructure/`, `detection-tools/`, `templates/`
   - Include `README.md`, `setup.sh`, a quick-reference doc, and a zero-to-hero doc.

7) Troubleshooting
   - Mock server will not start → check the port in `infrastructure/mock-server.js`.
   - Installs skip postinstall → confirm `TESTBENCH_MODE=enabled` is exported.

Use the labs carefully and keep them on isolated machines.
