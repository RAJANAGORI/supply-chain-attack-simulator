#!/usr/bin/env bash
# Replace legitimate packages/utils with the compromised workspace package and
# reinstall so postinstall posts to localhost:3000 (TESTBENCH_MODE).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}"

export TESTBENCH_MODE="${TESTBENCH_MODE:-enabled}"

if [[ ! -d compromised-package/utils ]]; then
  echo "Missing compromised-package/utils — run Prepare the lab / setup.sh first" >&2
  exit 1
fi

echo "→ Swapping packages/utils for compromised @devcorp/utils"
rm -rf packages/utils
cp -R compromised-package/utils packages/utils

echo "→ npm install at workspace root (postinstall should hit :3000)"
npm install

echo "✓ Compromised utils installed — check Live Inspector / curl :3000/captured-data"
