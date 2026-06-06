# Quick Reference — Scenario 22: LiteLLM-style PyPI compromise

Use this as your runbook for Scenario 22 when you are teaching live or practicing quickly.

- Setup: `cd scenarios/22-litellm-pypi-compromise && export TESTBENCH_MODE=enabled && ./setup.sh`
- Mock server: `python3 scenarios/22-litellm-pypi-compromise/infrastructure/mock_server.py` (port **3022**)
- Import path (`1.82.7`): `cd scenarios/22-litellm-pypi-compromise/victim-app && source .venv/bin/activate && pip install -U ../python-packages/v1_82_7 && export TESTBENCH_MODE=enabled && python run_victim.py`
- `.pth` path (`1.82.8`): `pip uninstall -y litellm_like && export TESTBENCH_MODE=enabled && pip install ../python-packages/v1_82_8 && python -c "print('pth')"`
- Evidence: `curl -s http://127.0.0.1:3022/captured-data` · `victim-app/.testbench-litellm-import.json` / `.testbench-litellm-pth.json`
- Detect: `source .venv/bin/activate && python ../detection-tools/litellm_pth_scanner.py`
- Port cleanup: `sudo ./scripts/kill-port.sh 3022`
