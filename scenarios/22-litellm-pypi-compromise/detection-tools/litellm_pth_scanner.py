#!/usr/bin/env python3
"""
Scan site-packages for suspicious .pth lines (testbench / litellm_like_pth_hook).
Run with the same interpreter you use for the lab, e.g.:
  victim-app/.venv/bin/python detection-tools/litellm_pth_scanner.py
"""

from __future__ import annotations

import sys
import sysconfig
from pathlib import Path


def main() -> None:
    pure = Path(sysconfig.get_paths()["purelib"])
    found = False
    for pth in sorted(pure.glob("*.pth")):
        text = pth.read_text(encoding="utf-8", errors="replace")
        if "litellm_like_pth_hook" in text or "testbench_litellm" in pth.name.lower():
            print(f"[SUSPICIOUS] {pth}")
            for line in text.strip().splitlines():
                print(f"    {line}")
            found = True
    if not found:
        print(f"[OK] No matching .pth under {pure}")


if __name__ == "__main__":
    main()
