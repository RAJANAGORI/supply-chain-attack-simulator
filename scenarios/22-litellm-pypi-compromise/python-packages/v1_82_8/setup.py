"""Installs optional .pth bootstrap when TESTBENCH_MODE=enabled at pip install time."""

from __future__ import annotations

import os
from pathlib import Path

from setuptools import find_packages, setup
from setuptools.command.install_lib import install_lib


class install_lib_with_pth(install_lib):
    """Drop a .pth that imports litellm_like_pth_hook (stdlib startup hook pattern)."""

    def run(self) -> None:
        super().run()
        if os.environ.get("TESTBENCH_MODE") != "enabled":
            return
        install_dir = Path(self.install_dir)
        pth = install_dir / "zzz_testbench_litellm_like.pth"
        pth.write_text("import litellm_like_pth_hook\n", encoding="utf-8")


setup(
    name="litellm_like",
    version="1.82.8",
    description="Testbench stand-in: .pth-based startup hook (simulated compromised release)",
    packages=find_packages(),
    py_modules=["litellm_like_pth_hook"],
    python_requires=">=3.8",
    cmdclass={"install_lib": install_lib_with_pth},
)
