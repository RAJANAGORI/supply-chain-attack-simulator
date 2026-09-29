#!/usr/bin/env bash
# Start SCAS dashboard stack: control plane + Next.js dashboard + Vite landing.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

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
export VITE_DASHBOARD_URL="${VITE_DASHBOARD_URL:-http://${PUBLIC_HOST}:3100}"
export VITE_CONTROL_PLANE_URL="${VITE_CONTROL_PLANE_URL:-http://${PUBLIC_HOST}:3101}"
# Observatory forwarding (no-op if ES is down)
export SCAS_ES_URL="${SCAS_ES_URL:-}"
export KIBANA_URL="${KIBANA_URL:-http://127.0.0.1:5601}"

if [[ ! -d node_modules ]]; then
  echo "Installing workspace dependencies…"
  npm install
elif [[ ! -e node_modules/lucide-react ]] || [[ ! -e node_modules/tailwindcss ]]; then
  echo "Updating workspace dependencies (new UI packages)…"
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
      echo "  ✓ $name ready"
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "  ✗ $name failed to start ($url)" >&2
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

echo "Starting control plane on ${BIND_HOST}:${CONTROL_PLANE_PORT}…"
npm run dev:control-plane &
wait_for "http://127.0.0.1:${CONTROL_PLANE_PORT}/api/health" "Control plane"

echo "Starting dashboard on ${BIND_HOST}:3100…"
npm run dev:dashboard &
wait_for "http://127.0.0.1:3100" "Dashboard"

echo "Starting landing on ${BIND_HOST}:5173…"
npm run dev:landing &

# Overlap landing boot with Next.js route compile — first Labs/Reset click stays fast.
warm_dashboard_routes() {
  echo "Precompiling dashboard routes…"
  local path
  # /scenarios/01 compiles shared app/scenarios/[id] for all 23 labs (not per-id bundles).
  for path in / /welcome /scenarios /scenarios/01 /observe /skills /report /classroom /teardown; do
    if curl -sf --max-time 120 "http://127.0.0.1:3100${path}" >/dev/null; then
      echo "  ✓ ${path}"
    else
      echo "  ✗ ${path} (will compile on first visit)" >&2
    fi
  done
}
warm_dashboard_routes

wait_for "http://127.0.0.1:5173" "Landing"

echo ""
echo "SCAS UI ready (bound on ${BIND_HOST}):"
echo "  Landing:       http://localhost:5173"
echo "  Dashboard:     http://localhost:3100"
echo "  Welcome:       http://localhost:3100/welcome"
echo "  Labs:          http://localhost:3100/scenarios"
echo "  Observatory:   http://localhost:3100/observe"
echo "  Control plane: http://localhost:${CONTROL_PLANE_PORT}/api/health"
if [[ -n "${SCAS_ES_URL:-}" ]]; then
  echo "  SCAS_ES_URL:   ${SCAS_ES_URL}"
else
  echo "  SCAS_ES_URL:   (unset — Observatory stays empty until ES is up)"
fi
if [[ -n "${LAN_IP}" ]]; then
  echo ""
  echo "  Network (LAN):"
  echo "    Landing:       http://${LAN_IP}:5173"
  echo "    Dashboard:     http://${LAN_IP}:3100"
  echo "    Control plane: http://${LAN_IP}:${CONTROL_PLANE_PORT}/api/health"
fi
echo ""
echo "Press Ctrl+C to stop all services."

wait
