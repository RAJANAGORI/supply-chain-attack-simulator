#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTS_FILE="${ROOT_DIR}/scripts/ports.env"

if [[ ! -f "${PORTS_FILE}" ]]; then
  echo "Missing ports configuration: ${PORTS_FILE}"
  exit 1
fi

# shellcheck source=/dev/null
source "${PORTS_FILE}"

echo "Starting testbench teardown..."

kill_on() {
  local p="$1"
  local pids
  pids="$(lsof -ti ":${p}" 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    echo "Killing processes on :${p} -> ${pids}"
    kill -9 ${pids} 2>/dev/null || true
  fi
}

echo "Freeing known scenario ports..."
for p in "${TESTBENCH_PORTS[@]}"; do
  kill_on "${p}"
done

echo "Removing captured mock-server artifacts..."
find "${ROOT_DIR}/scenarios" -type f \
  \( -name "captured-data.json" -o -name "captured-credentials.json" \) \
  -exec rm -f {} \;

echo "Removing scenario and sample app node_modules..."
find "${ROOT_DIR}/scenarios" "${ROOT_DIR}/vulnerable-apps" -type d -name "node_modules" -prune -exec rm -rf {} +

echo "Teardown complete."
echo "To disable in your current shell: unset TESTBENCH_MODE"
