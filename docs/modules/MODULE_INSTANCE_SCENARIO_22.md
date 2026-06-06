# Module Instance: Scenario 22 (LiteLLM-style PyPI compromise)

Based on [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md).

This scenario contrasts **import-time** malicious code with **`.pth` file**-driven execution at **Python interpreter startup**, using a fictional **`litellm_like`** package and **127.0.0.1**-only collection. See [GitHub issue #4](https://github.com/RAJANAGORI/supply-chain-attack-simulator/issues/4).

## 1) Module Card

- **Module ID**: `22`
- **Title**: `LiteLLM-style PyPI compromise (simulation)`
- **Level**: `Advanced`
- **Estimated Time**: `45-90 minutes`
- **Primary Attack Surface**: `Python site-packages, .pth startup hooks, pip install paths`
- **Prerequisites**: Python 3.8+, venv/pip basics; understanding of `import` vs startup side effects

## 2) Learning Objectives

- Compare **`1.82.7`-style** (runs on `import litellm_like`) vs **`1.82.8`-style** (`.pth` runs on any Python process).
- Audit **`site-packages`** for unexpected `.pth` files and suspicious `import` lines.
- Practice **venv rebuild**, **version pinning**, and mock **evidence** review after a suspected bad install.

## 3) Threat Model Snapshot

- **Asset at risk**: developer and CI Python environments, ML/AI dependency stacks
- **Trust edge abused**: PyPI (or mirror) as source of truth for **`pip install`**
- **Attacker objective**: execute without obvious `import` of the trojaned package (`.pth` path)
- **Blast radius**: every interpreter start in affected venvs/containers

## 4) Lab Setup

```bash
cd scenarios/22-litellm-pypi-compromise
export TESTBENCH_MODE=enabled
./setup.sh
```

Instructor run order (aligned with setup/README):

```bash
# Terminal A
python3 infrastructure/mock_server.py

# Terminal B - import-trigger path
cd victim-app
source .venv/bin/activate
pip install -U ../python-packages/v1_82_7
export TESTBENCH_MODE=enabled
python run_victim.py

# Terminal B - .pth startup path
pip uninstall -y litellm_like
export TESTBENCH_MODE=enabled
pip install ../python-packages/v1_82_8
python -c "print('any script triggers .pth')"

# Evidence + detection (scenario root)
curl -s http://127.0.0.1:3022/captured-data
python detection-tools/litellm_pth_scanner.py
```

## 5) Attack Walkthrough

1. Clean baseline: **`litellm_like@1.82.6`** in `victim-app/.venv`.
2. **Import path**: `pip install -U ../python-packages/v1_82_7`, then `python run_victim.py` with `TESTBENCH_MODE=enabled`.
3. **`.pth` path**: uninstall, then `TESTBENCH_MODE=enabled pip install ../python-packages/v1_82_8`; run `python -c "print('ok')"` (no import of package required).
4. Inspect `curl http://127.0.0.1:3022/captured-data` and marker JSON files under `victim-app/`.

## 6) Detection Playbook

- **Static checks**: `pip freeze`, `pip show litellm_like`, scan `site-packages/*.pth`.
- **Behavioral checks**: lab beacons to **3022**; unexpected files `.testbench-litellm-*.json`.

```bash
source victim-app/.venv/bin/activate
python detection-tools/litellm_pth_scanner.py
```

## 7) Mitigation Playbook

- Pin **`litellm_like==1.82.6`** (or hash) in requirements; use private index / vetting for critical stacks.
- Rebuild venvs from known-good lockfiles; rotate API keys after real incidents (synthetic only here).
- CI: **`TESTBENCH_OFFLINE=1`** or network egress blocks for install jobs where appropriate.

## 8) Validation Checklist (Success Criteria)

- [ ] Import-trigger path produces evidence when `TESTBENCH_MODE=enabled`.
- [ ] `.pth` path fires on generic `python -c` without importing `litellm_like`.
- [ ] Scanner reports suspicious `.pth` when present.
- [ ] Learner can distinguish import-time vs interpreter-startup execution risk.

## 9) Production Policy Snippet

```bash
# Example: list .pth files in active environment
python -c "import pathlib, sysconfig; print(*sorted(pathlib.Path(sysconfig.get_paths()['purelib']).glob('*.pth')), sep='\n')"
```

## 10) Debrief Questions

- Why is **`.pth`** harder to reason about than **import-time** malware for application developers?
- How would you **gate** ML dependency updates differently from general library updates?
- What is your org’s playbook for **quarantine, yank response, and consumer notification**?
