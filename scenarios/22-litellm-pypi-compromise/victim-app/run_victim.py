#!/usr/bin/env python3
"""Imports litellm_like (exercises import-time path for 1.82.7)."""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "_shared")))
import testbench_env  # noqa: F401, E402


def main() -> None:
    import litellm_like  # noqa: PLC0415

    print("[victim-app] imported litellm_like", getattr(litellm_like, "__version__", "?"))


if __name__ == "__main__":
    main()
