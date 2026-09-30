#!/usr/bin/env bash
# Clone the compromised parent repo (with recurse-submodules) and npm install so the
# real submodule postinstall fires into localhost:3000. Dashboard "Install" step.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}"

export TESTBENCH_MODE="${TESTBENCH_MODE:-enabled}"

if [[ ! -d work/awesome-project/.git ]]; then
  echo "→ Building local git repos (work/awesome-project + malicious submodule)"
  bash infrastructure/build-repos.sh
fi

echo "→ Cloning compromised repo with --recurse-submodules"
rm -rf work/victim-clone
git -c protocol.file.allow=always clone --recurse-submodules \
  work/awesome-project work/victim-clone

echo "→ npm install (postinstall runs libs/malicious-submodule/postinstall.sh)"
npm --prefix work/victim-clone install

echo "✓ Submodule attack path complete — check Live Inspector / curl :3000/captured-data"
