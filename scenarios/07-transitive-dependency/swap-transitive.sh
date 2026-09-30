#!/usr/bin/env bash
# Swap legitimate transitive data-processor for the compromised copy and fire postinstall.
# web-utils is a file: link, so Node resolves data-processor from web-utils's real path too.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VICTIM="${ROOT}/victim-app"
COMPROMISED="${ROOT}/compromised-packages/data-processor"
WEB_UTILS_NM="${ROOT}/legitimate-packages/web-utils/node_modules"

if [[ ! -d "${COMPROMISED}" ]]; then
  echo "Missing compromised package at ${COMPROMISED}" >&2
  exit 1
fi

mkdir -p "${VICTIM}/node_modules"
mkdir -p "${WEB_UTILS_NM}"

echo "→ Installing compromised data-processor into victim-app/node_modules"
rm -rf "${VICTIM}/node_modules/data-processor"
cp -R "${COMPROMISED}" "${VICTIM}/node_modules/data-processor"

echo "→ Installing compromised data-processor beside linked web-utils (require resolution)"
rm -rf "${WEB_UTILS_NM}/data-processor"
cp -R "${COMPROMISED}" "${WEB_UTILS_NM}/data-processor"

echo "→ Triggering postinstall (in-place swap does not re-run npm lifecycle scripts)"
export TESTBENCH_MODE="${TESTBENCH_MODE:-enabled}"
node "${VICTIM}/node_modules/data-processor/postinstall.js"

echo "✓ Transitive dependency swapped"
