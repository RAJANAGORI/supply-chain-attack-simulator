#!/usr/bin/env bash
# SCAS Docker install hub — platform + scenario labs + Command Center UI
# Usage:
#   ./docker/install.sh              # interactive menu
#   ./docker/install.sh --oneshot
#   ./docker/install.sh --oneshot --with-ui
#   ./docker/install.sh --ui-only
#   ./docker/install.sh --scenario 01 --with-ui
#   ./docker/install.sh --platform-only
#   ./docker/install.sh --status
#   ./docker/install.sh --down
#   ./docker/install.sh --down-all
set -euo pipefail

DOCKER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${DOCKER_ROOT}/lib/common.sh"
# shellcheck source=lib/platform.sh
source "${DOCKER_ROOT}/lib/platform.sh"
# shellcheck source=lib/scenarios.sh
source "${DOCKER_ROOT}/lib/scenarios.sh"
# shellcheck source=lib/ui.sh
source "${DOCKER_ROOT}/lib/ui.sh"

ONESHOT=0
PLATFORM_ONLY=0
UI_ONLY=0
WITH_PLATFORM=0
WITH_UI=0
STATUS=0
DOWN=0
DOWN_ALL=0
SCENARIO_ARG=""
INTERACTIVE=1

usage() {
  cat <<'EOF'
SCAS Docker install hub

  ./docker/install.sh                     Interactive menu
  ./docker/install.sh --oneshot           ES + Kibana + Floci + Scenario 01
  ./docker/install.sh --oneshot --with-ui … + Command Center (apps/)
  ./docker/install.sh --ui-only           Dashboard :3100 + Control plane :3101
  ./docker/install.sh --platform-only     ES + Kibana + Floci only
  ./docker/install.sh --scenario NN       Start one compose lab
  ./docker/install.sh --scenario NN --with-platform --with-ui
  ./docker/install.sh --status
  ./docker/install.sh --down              Stop scenario labs
  ./docker/install.sh --down-all          Stop labs + UI + platform

Env: SCAS_FORCE=1  allow starting a lab while another is running
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --oneshot) ONESHOT=1; INTERACTIVE=0 ;;
    --platform-only) PLATFORM_ONLY=1; INTERACTIVE=0 ;;
    --ui-only) UI_ONLY=1; INTERACTIVE=0 ;;
    --with-platform) WITH_PLATFORM=1 ;;
    --with-ui) WITH_UI=1 ;;
    --scenario)
      SCENARIO_ARG="${2:-}"
      INTERACTIVE=0
      shift
      ;;
    --status) STATUS=1; INTERACTIVE=0 ;;
    --down) DOWN=1; INTERACTIVE=0 ;;
    --down-all) DOWN_ALL=1; INTERACTIVE=0 ;;
    *)
      err "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

require_docker

if [[ "$STATUS" -eq 1 ]]; then
  scas_platform_status
  scas_ui_status
  scas_scenario_status
  exit 0
fi

if [[ "$DOWN_ALL" -eq 1 ]]; then
  scas_scenario_down
  scas_ui_down
  scas_platform_down
  ok "All Docker stacks stopped"
  exit 0
fi

if [[ "$DOWN" -eq 1 ]]; then
  scas_scenario_down
  ok "Scenario labs stopped"
  exit 0
fi

if [[ "$UI_ONLY" -eq 1 ]]; then
  scas_ui_up
  scas_ui_status
  exit 0
fi

if [[ "$PLATFORM_ONLY" -eq 1 ]]; then
  scas_platform_up
  scas_platform_status
  exit 0
fi

if [[ "$ONESHOT" -eq 1 ]]; then
  scas_platform_up
  local_dir="$(scas_resolve_scenario 01)" || { err "Scenario 01 compose not found"; exit 1; }
  scas_scenario_up "$local_dir"
  if [[ "$WITH_UI" -eq 1 ]]; then
    scas_ui_up
  fi
  scas_platform_status
  scas_ui_status
  scas_scenario_status
  exit 0
fi

if [[ -n "$SCENARIO_ARG" ]]; then
  if [[ "$WITH_PLATFORM" -eq 1 ]]; then
    scas_platform_up
  fi
  dir="$(scas_resolve_scenario "$SCENARIO_ARG")" || {
    err "No compose lab matching: $SCENARIO_ARG"
    exit 1
  }
  scas_scenario_up "$dir"
  if [[ "$WITH_UI" -eq 1 ]]; then
    scas_ui_up
  fi
  exit 0
fi

# Interactive menu
echo ""
echo "Supply Chain Attack Simulator — Docker setup"
echo "--------------------------------------------"
echo "  1) One-shot: ES + Kibana + Floci + Scenario 01"
echo "  2) Scenario picker (optional platform / UI)"
echo "  3) Platform only (ES + Kibana + Floci)"
echo "  4) Command Center UI only (apps/)"
echo "  5) Status"
echo "  6) Stop scenario labs"
echo "  7) Stop everything (labs + UI + platform)"
echo "  q) Quit"
echo ""
read -r -p "Choose [1]: " choice
choice="${choice:-1}"

case "$choice" in
  1)
    scas_platform_up
    dir="$(scas_resolve_scenario 01)"
    scas_scenario_up "$dir"
    read -r -p "Also start Command Center UI? [y/N]: " yn
    if [[ "${yn:-}" =~ ^[Yy]$ ]]; then
      scas_ui_up
    fi
    scas_platform_status
    scas_ui_status
    scas_scenario_status
    ;;
  2)
    echo ""
    echo "Compose-backed scenarios:"
    scas_print_lab_menu
    echo ""
    read -r -p "Scenario number: " num
    if [[ -z "${num:-}" || -z "${SCAS_MENU_DIRS[$((num - 1))]:-}" ]]; then
      err "Invalid selection"
      exit 1
    fi
    dir="${SCAS_MENU_DIRS[$((num - 1))]}"
    read -r -p "Also start ES/Kibana/Floci? [y/N]: " yn
    if [[ "${yn:-}" =~ ^[Yy]$ ]]; then
      scas_platform_up
    fi
    scas_scenario_up "$dir"
    read -r -p "Also start Command Center UI? [y/N]: " yn2
    if [[ "${yn2:-}" =~ ^[Yy]$ ]]; then
      scas_ui_up
    fi
    ;;
  3)
    scas_platform_up
    scas_platform_status
    ;;
  4)
    scas_ui_up
    scas_ui_status
    ;;
  5)
    scas_platform_status
    scas_ui_status
    scas_scenario_status
    ;;
  6)
    scas_scenario_down
    ;;
  7)
    scas_scenario_down
    scas_ui_down
    scas_platform_down
    ;;
  q|Q)
    exit 0
    ;;
  *)
    err "Unknown choice"
    exit 1
    ;;
esac
