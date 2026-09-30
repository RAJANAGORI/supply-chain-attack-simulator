#!/usr/bin/env bash
# Force-reinstall the compromised axios-like tarball so plain-crypto-js-like
# postinstall runs again (plain `npm install` is a no-op when already present,
# and the package swaps package.json to a decoy without postinstall after first run).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}/victim-app"

export TESTBENCH_MODE="${TESTBENCH_MODE:-enabled}"

TGZ="../packages/axios-like-1.14.1.tgz"
if [[ ! -f "${TGZ}" ]]; then
  echo "Missing ${TGZ} — run Prepare the lab / setup.sh first" >&2
  exit 1
fi

echo "→ Removing prior axios-like / plain-crypto-js-like installs"
rm -rf node_modules/axios-like node_modules/plain-crypto-js-like
# pnpm-style nested copies if any
find node_modules -type d -name 'plain-crypto-js-like' -prune -exec rm -rf {} + 2>/dev/null || true
find node_modules -type d -name 'axios-like' -prune -exec rm -rf {} + 2>/dev/null || true

echo "→ npm install compromised tarball (foreground scripts)"
npm install "axios-like@file:${TGZ}" --foreground-scripts --no-audit --no-fund

# Decoy may have already stripped postinstall; re-fire from the authored package if needed.
POST_SRC="${ROOT}/packages/plain-crypto-js-like/postinstall.js"
if [[ -f "${POST_SRC}" ]]; then
  echo "→ Ensuring postinstall beacon (authored package script)"
  INIT_CWD="$(pwd)" node "${POST_SRC}" || true
fi

# Brief settle so mock can persist before dashboard verify polls
sleep 0.4

echo "✓ Compromised release installed — check Live Inspector / curl :3021/captured-data"
