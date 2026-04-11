#!/usr/bin/env python3
"""Imports litellm_like (exercises import-time path for 1.82.7)."""

from __future__ import annotations

import os
import sys


def main() -> None:
    if os.environ.get("TESTBENCH_MODE") != "enabled":
        print("Set TESTBENCH_MODE=enabled for this lab.")
        sys.exit(0)

    import litellm_like  # noqa: PLC0415

    print("[victim-app] imported litellm_like", getattr(litellm_like, "__version__", "?"))


if __name__ == "__main__":
    main()
