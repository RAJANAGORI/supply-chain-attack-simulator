# Vulnerable sample applications

Optional targets for supply-chain labs. Each app is **intentionally weak** — use only in isolated environments with `TESTBENCH_MODE=enabled`.

| App | Path | Used by |
|-----|------|---------|
| Node.js API | [nodejs-app/](./nodejs-app/) | [Scenario 03](../scenarios/03-compromised-package/README.md) and general dependency exercises |

There is no separate Python or CI sample app in this folder today; scenarios **22** (PyPI) and **05** (build) carry their own victim apps under `scenarios/`.

**Related:** [Scenario catalog](../documentation/scenario-guides/CATALOG.md) · [Detection tools](../detection-tools/)
