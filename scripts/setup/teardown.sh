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

echo "Starting testbench teardown..."

# UI / control-plane ports — never touch these (dashboard proxies to 3101).
PROTECTED_PORTS=(3100 3101)

is_protected_port() {
  local p="$1"
  local x
  for x in "${PROTECTED_PORTS[@]}"; do
    [[ "${p}" == "${x}" ]] && return 0
  done
  return 1
}

kill_on() {
  local p="$1"
  local pids
  if is_protected_port "${p}"; then
    echo "Skipping protected UI port :${p}"
    return 0
  fi
  # LISTEN only — bare `lsof -ti :PORT` also matches clients with ESTABLISHED
  # connections (e.g. control plane polling mock captures) and would kill them.
  pids="$(lsof -nP -iTCP:"${p}" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    echo "Killing listeners on :${p} -> ${pids}"
    # shellcheck disable=SC2086
    kill -9 ${pids} 2>/dev/null || true
  fi
}

# Scenario / registry ports only — keep ES/Kibana (9200/5601) unless explicitly requested.
LAB_PORTS=(3000 3001 3002 3003 3015 3016 3017 3018 3019 3020 3021 3022 3023 4873 4874)

echo "Freeing known scenario ports..."
for p in "${LAB_PORTS[@]}"; do
  kill_on "${p}"
done

echo "Removing captured mock-server artifacts..."
find "${ROOT_DIR}/scenarios" -type f \
  \( -name "captured-data.json" -o -name "captured-credentials.json" -o -name "beacons.json" \) \
  -exec rm -f {} \;

echo "Removing scenario node_modules..."
find "${ROOT_DIR}/scenarios" -type d -name "node_modules" -prune -exec rm -rf {} +

# Learner progress (storyboard resume / verified steps) — also cleared by control plane
# on POST /platform/teardown; this covers direct CLI runs of teardown.sh.
PROGRESS_FILE="${SCAS_PROGRESS_PATH:-${HOME}/.scas/progress.json}"
if [[ -f "${PROGRESS_FILE}" ]]; then
  echo "Clearing learner progress: ${PROGRESS_FILE}"
  rm -f "${PROGRESS_FILE}"
fi

if [[ "${SCAS_STOP_OBSERVABILITY:-}" == "1" ]]; then
  echo "Stopping optional Elasticsearch + Kibana stack..."
  "${ROOT_DIR}/scripts/observability/elasticsearch-down.sh" || true
fi

echo "Teardown complete."
echo "Lab ports freed, captures removed, progress cleared."
echo "Dashboard / control plane were left running. Re-run a lab setup to start clean."
echo "To disable in your current shell: unset TESTBENCH_MODE"
