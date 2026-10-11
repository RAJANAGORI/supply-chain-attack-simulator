"""
Optional Floci S3 mirror for SCAS scenarios (SCAS_FLOCI_ENABLED=1).
Python equivalent of floci-exfil.js — calls scripts/floci/floci-upload-json.sh.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


def find_upload_script() -> Path | None:
    directory = Path.cwd()
    for _ in range(12):
        for candidate in (
            directory / "scripts" / "floci" / "floci-upload-json.sh",
            directory / "scripts" / "floci-upload-json.sh",
        ):
            if candidate.is_file():
                return candidate
        parent = directory.parent
        if parent == directory:
            break
        directory = parent
    return None


def upload_json(
    scenario_id: str,
    key_suffix: str,
    payload: dict,
    prefix: str = "exfil",
) -> bool:
    if os.environ.get("TESTBENCH_MODE") != "enabled":
        return False
    if os.environ.get("SCAS_FLOCI_ENABLED") != "1":
        return False
    script = find_upload_script()
    if script is None:
        print(
            f"SCAS runner: Floci CLI was not called for scenario {scenario_id}. floci-upload-json.sh was not found.",
            file=sys.stderr,
        )
        return False
    try:
        subprocess.run(
            [str(script), str(scenario_id), key_suffix, prefix],
            input=json.dumps(payload).encode("utf-8"),
            check=True,
            env=os.environ.copy(),
        )
        return True
    except (subprocess.CalledProcessError, OSError):
        print(
            f"SCAS runner: Floci CLI failed for scenario {scenario_id}. The mock-server capture is a separate channel.",
            file=sys.stderr,
        )
        return False
