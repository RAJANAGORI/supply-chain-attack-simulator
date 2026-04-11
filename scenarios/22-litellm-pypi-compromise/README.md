# Scenario 22: LiteLLM-style PyPI compromise (simulation)

**Inspired by:** PyPI account compromise pattern with **import-time** vs **`.pth` startup** execution, as requested in [GitHub issue #4](https://github.com/RAJANAGORI/supply-chain-attack-simulator/issues/4). This lab uses a **fictional** package name `litellm_like` and **127.0.0.1**-only HTTP—no credential theft, no external exfiltration.

## Learning objectives

- Compare **malicious code on import** (modelled as `1.82.7`) vs **`.pth` hook at interpreter startup** (modelled as `1.82.8`).
- Practice **site-packages triage** (find unexpected `.pth` files).
- Walk **containment → eradication → recovery**: uninstall, rebuild venv, **pin** known-good version, rotate secrets (real incidents; here, synthetic markers only).

## Releases (testbench)

| Path | Version | Behavior |
|------|---------|----------|
| `python-packages/v1_82_6` | `1.82.6` | Clean |
| `python-packages/v1_82_7` | `1.82.7` | On `import litellm_like`, writes `.testbench-litellm-import.json` and POSTs to mock server |
| `python-packages/v1_82_8` | `1.82.8` | If **installed with** `TESTBENCH_MODE=enabled`, adds `zzz_testbench_litellm_like.pth` under `site-packages` importing `litellm_like_pth_hook` |

## Setup

**Prerequisites:** Python 3.8+

```bash
cd scenarios/22-litellm-pypi-compromise
export TESTBENCH_MODE=enabled
chmod +x setup.sh
./setup.sh
```

## Run the lab

**Terminal A — mock collector**

```bash
python3 infrastructure/mock_server.py
```

### A) Import-trigger (`1.82.7`)

```bash
cd victim-app
source .venv/bin/activate
pip install -U ../python-packages/v1_82_7
export TESTBENCH_MODE=enabled
python run_victim.py
```

### B) `.pth` startup (`1.82.8`)

```bash
cd victim-app
source .venv/bin/activate
pip uninstall -y litellm_like
export TESTBENCH_MODE=enabled
pip install ../python-packages/v1_82_8
# Any Python process loads .pth — no need to import litellm_like
python -c "print('hello')"
```

**Evidence**

```bash
curl -s http://127.0.0.1:3022/captured-data
ls -la victim-app/.testbench-litellm-*.json
```

**Blue team — scan `.pth`**

```bash
cd scenarios/22-litellm-pypi-compromise
source victim-app/.venv/bin/activate
python detection-tools/litellm_pth_scanner.py
```

## Containment, eradication, recovery

1. **Contain:** stop workloads using the venv; block outbound from CI runners if this were real exfil.
2. **Eradicate:** `pip uninstall litellm_like`; delete `.venv` and recreate from locked requirements; remove rogue `*.pth` under `site-packages` if any remain.
3. **Recover:** pin **`litellm_like==1.82.6`** (or your verified hash / private mirror); enforce **hash pinning** or **vetting** for critical AI/ML stacks.
4. **Rotate:** API keys and PyPI tokens for maintainers (real-world); this lab has no secrets.

## CI-safe and offline modes

- Traffic is only to **`127.0.0.1:3022`**.
- **`TESTBENCH_OFFLINE=1`:** import / `.pth` hooks skip `urllib` beacons (markers may still be written for import path — see `litellm_like/__init__.py` / hook; adjust if you need zero network and zero markers).

## References (real world)

- [Issue #4](https://github.com/RAJANAGORI/supply-chain-attack-simulator/issues/4) links: maintainer thread, GHSA, vendor analyses (external).

## Safety

Educational testbench only. Do not reuse patterns against systems you do not own.
