# Detection Runbook: Scenario 22 (LiteLLM-style PyPI Compromise)

## IOCs
- Unexpected `.pth` file in site-packages (`zzz_testbench_litellm_like.pth`).
- Import/startup marker files `.testbench-litellm-*.json`.
- Beacon/capture activity to `127.0.0.1:3022`.

## Sample Log Lines
```json
{"scenario_id":"22","event_type":"python_startup_hook_exec","source":"litellm_like_pth_hook","destination":"127.0.0.1:3022","timestamp_utc":"2026-04-20T13:45:00Z"}
```

## Sigma (example)
```yaml
title: Python Startup Hook (.pth) Execution Indicator
detection:
  selection:
    file.path|endswith: ".pth"
    file.content|contains: "litellm_like_pth_hook"
  condition: selection
level: high
```

## YARA-like Text Rule (example)
```text
rule PyPI_PTH_Compromise_IOC {
  strings:
    $a = "zzz_testbench_litellm_like.pth"
    $b = "litellm_like_pth_hook"
    $c = "3022"
  condition:
    all of them
}
```

## EDR/SIEM What To Expect
- Python process execution with no explicit package import still triggering activity.
- Site-packages file integrity drift (`.pth` additions).
- Detector findings from `litellm_pth_scanner.py` and mock capture output.

## Mitigation

- Contain: stop workloads using the compromised virtualenv; block egress from CI if needed.
- Eradicate: `pip uninstall`, delete `.venv`, remove rogue `*.pth` under `site-packages`.
- Recover: pin known-good version (`litellm_like==1.82.6`); enforce hash pinning or vetting.
- Rotate: API keys and PyPI maintainer tokens after confirmed incidents.
- Scan `site-packages/*.pth` in CI after every `pip install`.

## Floci (optional cloud track)
- Unexpected `PutObject` under `s3://scas-sc22-artifacts/exfil/` when `SCAS_FLOCI_ENABLED=1`.
- Verify: `./infrastructure/floci/verify.sh` or `detection-tools/floci/s3-exfil-check.sh 22`.
