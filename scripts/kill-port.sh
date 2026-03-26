#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-}"
if [[ -z "${PORT}" ]]; then
  echo "Usage: $0 <port>"
  exit 1
fi

echo "Freeing port :${PORT} ..."

# -t outputs only PIDs; kill -9 is intentional for testbench cleanup.
PIDS="$(sudo lsof -ti ":${PORT}" || true)"
if [[ -z "${PIDS}" ]]; then
  echo "No process found on port :${PORT}"
  exit 0
fi

echo "Killing PIDs on port :${PORT}: ${PIDS}"
sudo kill -9 ${PIDS}

echo "Port :${PORT} freed."
