#!/usr/bin/env bash
# Start SCAS control center: control plane + Next.js dashboard.
# Public marketing site: https://simulator.rajanagori.in/ (not started locally).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/scas-term.sh
source "${ROOT}/scripts/lib/scas-term.sh"

# Inherit workshop env (ES / Floci / TESTBENCH) when present
if [[ -f "${ROOT}/.scas.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "${ROOT}/.scas.env"
  set +a
elif [[ -f "${ROOT}/.testbench.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "${ROOT}/.testbench.env"
  set +a
fi

# Repo-local act binary from ensure-act.sh
if [[ -d "${ROOT}/.tools/bin" ]]; then
  export PATH="${ROOT}/.tools/bin:${PATH}"
fi

BIND_HOST="${SCAS_BIND_HOST:-0.0.0.0}"
PUBLIC_HOST="${SCAS_PUBLIC_HOST:-0.0.0.0}"

export SCAS_REPO_ROOT="$ROOT"
export TESTBENCH_MODE="${TESTBENCH_MODE:-enabled}"
export CONTROL_PLANE_HOST="$BIND_HOST"
export CONTROL_PLANE_PORT="${CONTROL_PLANE_PORT:-3101}"
export SCAS_PUBLIC_HOST="$PUBLIC_HOST"
export NEXT_PUBLIC_CONTROL_PLANE_URL="${NEXT_PUBLIC_CONTROL_PLANE_URL:-http://${PUBLIC_HOST}:3101}"
# Observatory forwarding (no-op if ES is down; mocks need this at process start)
export SCAS_ES_URL="${SCAS_ES_URL:-http://127.0.0.1:9200}"
export KIBANA_URL="${KIBANA_URL:-http://127.0.0.1:5601}"

if [[ ! -d node_modules ]]; then
  scas_log "Installing workspace dependencies…"
  npm install
elif [[ ! -e node_modules/lucide-react ]] || [[ ! -e node_modules/tailwindcss ]]; then
  scas_log "Updating workspace dependencies (new UI packages)…"
  npm install
fi

cleanup() {
  trap - EXIT INT TERM
  for pid in $(jobs -p); do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

wait_for() {
  local url=$1
  local name=$2
  local i=0
  while [[ $i -lt 30 ]]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      scas_ok "$name ready"
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  scas_fail "$name failed to start ($url)"
  return 1
}

detect_lan_ip() {
  if command -v ip >/dev/null 2>&1; then
    ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit }}'
  elif command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | awk '{print $1}'
  fi
}

LAN_IP="$(detect_lan_ip || true)"
if [[ -n "${LAN_IP}" ]]; then
  export SCAS_LAN_IP="${LAN_IP}"
fi

scas_log "Control plane bind ${BIND_HOST}:${CONTROL_PLANE_PORT}"
npm run dev:control-plane &
wait_for "http://127.0.0.1:${CONTROL_PLANE_PORT}/api/health" "Control plane"

scas_log "Dashboard bind ${BIND_HOST}:3100"
npm run dev:dashboard &
wait_for "http://127.0.0.1:3100" "Dashboard"

# Warm Next.js routes so first Labs/Reset click stays fast.
warm_dashboard_routes() {
  scas_log "Precompiling dashboard routes…"
  local path
  for path in / /welcome /scenarios /scenarios/01 /observe /skills /report /classroom /teardown; do
    if curl -sf --max-time 120 "http://127.0.0.1:3100${path}" >/dev/null; then
      scas_ok "${path}"
    else
      scas_warn "${path} (will compile on first visit)"
    fi
  done
}
warm_dashboard_routes

scas_panel_open "OPERATOR CONSOLE"
scas_panel_row "Dashboard" "http://localhost:3100"
scas_panel_row "Welcome" "http://localhost:3100/welcome"
scas_panel_row "Labs" "http://localhost:3100/scenarios"
scas_panel_row "Attack maps" "http://localhost:3100/archify/INDEX.md"
scas_panel_row "Observatory" "http://localhost:3100/observe"
scas_panel_row "Control plane" "http://localhost:${CONTROL_PLANE_PORT}/api/health"
scas_panel_row "Marketing" "https://simulator.rajanagori.in/"
if [[ -n "${SCAS_ES_URL:-}" ]]; then
  scas_panel_row "SCAS_ES_URL" "${SCAS_ES_URL}"
else
  scas_panel_row "SCAS_ES_URL" "(unset - Observatory empty until ES is up)"
fi
if [[ -n "${LAN_IP}" ]]; then
  scas_panel_blank
  scas_panel_note "LAN reachability"
  scas_panel_row "LAN dash" "http://${LAN_IP}:3100"
  scas_panel_row "LAN API" "http://${LAN_IP}:${CONTROL_PLANE_PORT}/api/health"
fi
scas_panel_note "bound on ${BIND_HOST}"
scas_panel_close
scas_boot_footer

wait
