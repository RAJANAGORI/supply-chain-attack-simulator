#!/usr/bin/env bash
# Start SCAS control center: control plane + Next.js dashboard.
# Public marketing site: https://simulator.rajanagori.in/ (not started locally).
#
# Default: production (build dashboard once, then next start + control-plane start).
# Hot-reload workshop hacking: SCAS_UI_DEV=1 ./run.sh
# Skip GA: NEXT_PUBLIC_SCAS_DISABLE_GA=1
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
UI_DEV="${SCAS_UI_DEV:-0}"

export SCAS_REPO_ROOT="$ROOT"
export TESTBENCH_MODE="${TESTBENCH_MODE:-enabled}"
export CONTROL_PLANE_HOST="$BIND_HOST"
export CONTROL_PLANE_PORT="${CONTROL_PLANE_PORT:-3101}"
export SCAS_PUBLIC_HOST="$PUBLIC_HOST"
export NEXT_PUBLIC_CONTROL_PLANE_URL="${NEXT_PUBLIC_CONTROL_PLANE_URL:-http://${PUBLIC_HOST}:3101}"
# Same GA4 property as docs/index.html (override with NEXT_PUBLIC_GA_ID=...)
export NEXT_PUBLIC_GA_ID="${NEXT_PUBLIC_GA_ID:-G-0EC7Y69Y12}"
# Observatory forwarding (no-op if ES is down; mocks need this at process start)
export SCAS_ES_URL="${SCAS_ES_URL:-http://127.0.0.1:9200}"
export KIBANA_URL="${KIBANA_URL:-http://127.0.0.1:5601}"

# Reinstall when the tree is missing OR a known workspace dep is absent
# (package.json can gain deps like js-yaml without wiping node_modules).
if [[ ! -d node_modules ]] \
  || [[ ! -e node_modules/lucide-react ]] \
  || [[ ! -e node_modules/tailwindcss ]] \
  || [[ ! -e node_modules/js-yaml ]] \
  || [[ ! -e node_modules/express ]]; then
  scas_log "Installing workspace dependencies…"
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
  local limit=60
  while [[ $i -lt $limit ]]; do
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

if [[ "$UI_DEV" = "1" ]]; then
  scas_log "Control plane bind ${BIND_HOST}:${CONTROL_PLANE_PORT}"
  npm run dev:control-plane &
  wait_for "http://127.0.0.1:${CONTROL_PLANE_PORT}/api/health" "Control plane"

  scas_log "Dashboard bind ${BIND_HOST}:3100"
  npm run dev:dashboard &
  wait_for "http://127.0.0.1:3100" "Dashboard"
else
  # next start needs a real production build (.next/BUILD_ID). A leftover
  # empty/partial .next from failed builds or next dev is not enough.
  DASH_BUILD_ID="${ROOT}/apps/dashboard/.next/BUILD_ID"
  if [[ "${SCAS_FORCE_BUILD:-0}" = "1" || ! -f "${DASH_BUILD_ID}" ]]; then
    scas_log "Building @scas/dashboard…"
    npm run build:dashboard
  else
    scas_log "Reusing apps/dashboard/.next (set SCAS_FORCE_BUILD=1 to rebuild)"
  fi
  if [[ ! -f "${DASH_BUILD_ID}" ]]; then
    scas_fail "Dashboard production build missing after build (${DASH_BUILD_ID})"
    exit 1
  fi

  scas_log "Control plane bind ${BIND_HOST}:${CONTROL_PLANE_PORT}"
  npm run start:control-plane &
  wait_for "http://127.0.0.1:${CONTROL_PLANE_PORT}/api/health" "Control plane"

  scas_log "Dashboard bind ${BIND_HOST}:3100"
  npm run start:dashboard &
  wait_for "http://127.0.0.1:3100" "Dashboard"
fi

# Warm routes so first Labs/Reset click stays fast (dev compile or prod cache).
warm_dashboard_routes() {
  scas_log "Warming dashboard routes…"
  local path
  for path in / /welcome /scenarios /scenarios/01 /scenarios/01/brief /observe /skills /report /classroom /teardown; do
    if curl -sf --max-time 120 "http://127.0.0.1:3100${path}" >/dev/null; then
      scas_ok "${path}"
    else
      scas_warn "${path} (will load on first visit)"
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
