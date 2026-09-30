#!/usr/bin/env bash
# Install malicious dev-tool into victim-app and ensure postinstall fires
# (newer npm may skip lifecycle scripts until allowScripts approves them).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}/victim-app"

export TESTBENCH_MODE="${TESTBENCH_MODE:-enabled}"

echo "→ npm install malicious-dev-tool"
npm install ../dev-tools/malicious-dev-tool

POST="${ROOT}/victim-app/node_modules/dev-tool/postinstall.js"
if [[ -f "${POST}" ]]; then
  echo "→ Ensuring postinstall runs (TESTBENCH_MODE=${TESTBENCH_MODE})"
  node "${POST}"
fi

echo "✓ Malicious developer tool installed"
