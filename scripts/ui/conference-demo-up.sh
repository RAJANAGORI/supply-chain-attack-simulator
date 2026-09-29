#!/usr/bin/env bash
# Conference demo bootstrap - run ON the lab server (raja@192.168.64.2)
# after you have cloned/pulled this branch.
#
# Usage (on the server, from the repo root):
#   chmod +x scripts/ui/conference-demo-up.sh
#   ./scripts/ui/conference-demo-up.sh
#
# What it does:
#   1) prereq check (docker, node, npm, python, git, curl)
#   2) ./scripts/ui/run-everything.sh  (ES + Floci + act + dashboard)
#   3) smoke: control-plane health, dashboard, lab 01 setup+services verify API
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

log()  { printf '\n▶ %s\n' "$*"; }
ok()   { printf '✓ %s\n' "$*"; }
warn() { printf '! %s\n' "$*" >&2; }
err()  { printf '✗ %s\n' "$*" >&2; }

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Missing required tool: $1"
    return 1
  fi
  ok "$1: $(command -v "$1")"
}

log "Prerequisites"
need git
need curl
need node
need npm
need python3 || need python
if ! command -v docker >/dev/null 2>&1; then
  err "Docker is required for Observatory + Floci. Install Docker Engine/Desktop and re-run."
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  err "Docker daemon is not running. Start it, then re-run."
  exit 1
fi
ok "docker daemon up"
node -v
npm -v

log "Pull / tooling bits"
chmod +x run.sh scripts/ui/run-everything.sh scripts/setup/ensure-act.sh \
  scripts/ui/start-dashboard.sh scripts/observability/*.sh scripts/floci/*.sh 2>/dev/null || true

# Install act early so run-everything does not fail mid-stack
./scripts/setup/ensure-act.sh

log "Starting full stack in background (logs: /tmp/scas-demo.log)"
# run-everything ends with exec start-dashboard (blocking). Run detached.
nohup ./scripts/ui/run-everything.sh --skip-setup > /tmp/scas-demo.log 2>&1 &
DEMO_PID=$!
echo "$DEMO_PID" > /tmp/scas-demo.pid
ok "Started PID $DEMO_PID (or will start after setup)"

# If node_modules missing, do setup first then restart
if [[ ! -d node_modules ]]; then
  log "node_modules missing - running setup first"
  kill "$DEMO_PID" 2>/dev/null || true
  ./scripts/setup/setup.sh
  npm install
  nohup ./scripts/ui/run-everything.sh --skip-setup > /tmp/scas-demo.log 2>&1 &
  DEMO_PID=$!
  echo "$DEMO_PID" > /tmp/scas-demo.pid
  ok "Restarted PID $DEMO_PID"
fi

log "Waiting for control plane :3101"
for i in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:3101/api/health" >/dev/null 2>&1; then
    ok "Control plane ready"
    break
  fi
  sleep 2
  if [[ "$i" -eq 90 ]]; then
    err "Control plane did not start. Tail /tmp/scas-demo.log:"
    tail -80 /tmp/scas-demo.log || true
    exit 1
  fi
done

log "Waiting for dashboard :3100"
for i in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:3100" >/dev/null 2>&1; then
    ok "Dashboard ready"
    break
  fi
  sleep 2
  if [[ "$i" -eq 90 ]]; then
    err "Dashboard did not start. Tail /tmp/scas-demo.log"
    tail -80 /tmp/scas-demo.log || true
    exit 1
  fi
done

# shellcheck disable=SC1091
[[ -f .scas.env ]] && source .scas.env || true

log "API smoke"
curl -fsS "http://127.0.0.1:3101/api/health" | head -c 400; echo
curl -fsS "http://127.0.0.1:3101/api/scenarios" | head -c 200; echo "…"
curl -fsS "http://127.0.0.1:3101/api/scenarios/01" | head -c 300; echo "…"

log "Lab 01 guided path (setup + services)"
curl -fsS -X POST "http://127.0.0.1:3101/api/scenarios/01/setup" >/tmp/scas-01-setup.json
echo "setup => $(cat /tmp/scas-01-setup.json)"
sleep 8
curl -fsS -X POST "http://127.0.0.1:3101/api/scenarios/01/services/start" >/tmp/scas-01-svc.json
echo "services => $(cat /tmp/scas-01-svc.json)"
sleep 2
curl -fsS "http://127.0.0.1:3101/api/scenarios/01/lesson/verify" | head -c 500; echo

log "Optional ES / Floci"
if curl -fsS "http://127.0.0.1:9200/_cluster/health" >/dev/null 2>&1; then
  ok "Elasticsearch up"
else
  warn "Elasticsearch not up yet (Observatory will show offline until it is)"
fi
if curl -fsS -o /dev/null "http://127.0.0.1:4566/_floci/health" 2>/dev/null || \
   curl -fsS -o /dev/null "http://127.0.0.1:4566" 2>/dev/null; then
  ok "Floci up"
else
  warn "Floci not up yet"
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
IP="${IP:-192.168.64.2}"

echo ""
ok "Conference demo stack is up"
echo "  Dashboard:  http://${IP}:3100"
echo "  Welcome:    http://${IP}:3100/welcome"
echo "  Labs:       http://${IP}:3100/scenarios/01"
echo "  Observatory:http://${IP}:3100/observe"
echo "  Health:     http://${IP}:3101/api/health"
echo "  Logs:       tail -f /tmp/scas-demo.log"
echo ""
echo "Presenter tip: open Lab 01 storyboard and walk Setup → Services → Install → Run → Detect"
