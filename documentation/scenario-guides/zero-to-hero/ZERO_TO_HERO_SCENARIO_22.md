# Zero-to-Hero — Scenario 22: LiteLLM-style PyPI compromise

1. **Overview**: Compare **import-time** malware (`1.82.7`) with **`.pth` startup** hooks (`1.82.8`) in a fictional **`litellm_like`** package—**127.0.0.1** mock server only.
2. **Setup**: `cd scenarios/22-litellm-pypi-compromise && export TESTBENCH_MODE=enabled && ./setup.sh`
3. **Mock server**: `python3 infrastructure/mock_server.py` (port **3022**)
4. **Import path**: `cd victim-app && source .venv/bin/activate && pip install -U ../python-packages/v1_82_7 && export TESTBENCH_MODE=enabled && python run_victim.py`
5. **`.pth` path**: `pip uninstall -y litellm_like && export TESTBENCH_MODE=enabled && pip install ../python-packages/v1_82_8 && python -c "print(1)"` — no `import litellm_like` needed.
6. **Evidence**: `curl http://127.0.0.1:3022/captured-data` · marker files under `victim-app/`
7. **Detect**: `python detection-tools/litellm_pth_scanner.py` (with venv activated)
8. **Response**: delete `.venv`, reinstall from pinned requirements; scan **`site-packages/*.pth`**; rotate secrets after real PyPI compromises.

**Exercises**

- Describe when **`.pth`** is more dangerous than **import-time** payloads for security monitoring.
- Write a one-line **`pip install`** policy your team would use for critical AI dependencies.
