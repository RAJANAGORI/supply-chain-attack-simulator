#!/usr/bin/env bash
# pnpm install so .pnpmfile.cjs injects malicious-logger into target-lib.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}/victim-app"

export TESTBENCH_MODE="${TESTBENCH_MODE:-enabled}"

echo "→ pnpm install (loads .pnpmfile.cjs hooks)"
npx --yes pnpm@9.15.9 install

if [[ ! -d node_modules/target-lib ]]; then
  echo "target-lib missing after pnpm install" >&2
  exit 1
fi

echo "✓ Install complete — malicious-logger should be injected via .pnpmfile.cjs"
ls -la node_modules/target-lib 2>/dev/null || true
ls -la node_modules/malicious-logger 2>/dev/null || ls -la node_modules/.pnpm 2>/dev/null | head -5 || true
