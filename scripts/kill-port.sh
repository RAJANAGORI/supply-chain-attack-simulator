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

PORT="${1:-}"
if [[ -z "${PORT}" ]]; then
  echo "Usage: $0 <port|--all>"
  echo "Allowed ports: ${TESTBENCH_PORTS[*]}"
  exit 1
fi

kill_one_port() {
  local p="$1"
  local pids
  echo "Freeing port :${p} ..."
  # -t outputs only PIDs; kill -9 is intentional for testbench cleanup.
  pids="$(lsof -ti ":${p}" || true)"
  if [[ -z "${pids}" ]]; then
    echo "No process found on port :${p}"
    return 0
  fi

  echo "Killing PIDs on port :${p}: ${pids}"
  kill -9 ${pids} || true
  echo "Port :${p} freed."
}

if [[ "${PORT}" == "--all" ]]; then
  for p in "${TESTBENCH_PORTS[@]}"; do
    kill_one_port "${p}"
  done
  exit 0
fi

is_allowed=0
for p in "${TESTBENCH_PORTS[@]}"; do
  if [[ "${p}" == "${PORT}" ]]; then
    is_allowed=1
    break
  fi
done

if [[ "${is_allowed}" -ne 1 ]]; then
  echo "Port ${PORT} is not in the testbench allow-list."
  echo "Allowed ports: ${TESTBENCH_PORTS[*]}"
  exit 1
fi

kill_one_port "${PORT}"
