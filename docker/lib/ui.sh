#!/usr/bin/env bash
# Command Center UI stack (dashboard / control-plane)
# shellcheck shell=bash

SCAS_UI_COMPOSE="${SCAS_DOCKER_ROOT}/compose/ui.yml"

scas_ui_up() {
  require_docker
  log "Starting Command Center UI (dashboard :3100, control-plane :3101)…"
  docker compose -f "${SCAS_UI_COMPOSE}" up -d --build --wait --wait-timeout 180
  ok "UI up"
  echo ""
  echo "  Dashboard:     http://localhost:3100"
  echo "  Control plane: http://localhost:3101/api/health"
  echo "  Marketing:     https://simulator.rajanagori.in/"
  echo ""
}

scas_ui_down() {
  require_docker
  log "Stopping Command Center UI…"
  docker compose -f "${SCAS_UI_COMPOSE}" down --remove-orphans 2>/dev/null || true
}

scas_ui_status() {
  printf '\n%sCommand Center UI%s\n' "${C_DIM}" "${C_RESET}"
  if curl -fsS "http://127.0.0.1:3101/api/health" >/dev/null 2>&1; then
    ok "Control plane  http://localhost:3101"
  else
    warn "Control plane  (down)"
  fi
  if curl -fsS -o /dev/null "http://127.0.0.1:3100" 2>/dev/null; then
    ok "Dashboard      http://localhost:3100"
  else
    warn "Dashboard      (down)"
  fi
}
