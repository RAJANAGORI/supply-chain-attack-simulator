from setuptools import find_packages, setup

setup(
    name="litellm_like",
    version="1.82.6",
    description="Testbench stand-in for a popular LLM client library (clean)",
    packages=find_packages(),
    python_requires=">=3.8",
)
