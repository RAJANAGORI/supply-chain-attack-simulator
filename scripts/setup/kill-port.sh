#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORTS_FILE="${ROOT_DIR}/scripts/setup/ports.env"

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

# Never kill the Control Center stack (dashboard / control plane).
PROTECTED_PORTS=(3100 3101)

is_protected_port() {
  local p="$1"
  local x
  for x in "${PROTECTED_PORTS[@]}"; do
    [[ "${p}" == "${x}" ]] && return 0
  done
  return 1
}

kill_one_port() {
  local p="$1"
  local pids
  echo "Freeing port :${p} ..."
  if is_protected_port "${p}"; then
    echo "Refusing to kill protected UI port :${p}"
    return 0
  fi
  # LISTEN only — do not kill clients connected to this port (control plane, browsers).
  pids="$(lsof -nP -iTCP:"${p}" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -z "${pids}" ]]; then
    echo "No listener found on port :${p}"
    return 0
  fi

  echo "Killing listeners on port :${p}: ${pids}"
  # shellcheck disable=SC2086
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
