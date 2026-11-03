#!/usr/bin/env bash
# SCAS terminal chrome - phosphor / ops-console look for ./run.sh and friends.
# Safe on plain TTYs: set NO_COLOR=1 or SCAS_TERM=plain to strip ANSI.
#
# Usage (from any script under scripts/):
#   # shellcheck source=scripts/lib/scas-term.sh
#   source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib/scas-term.sh"
#   scas_banner
#   scas_stage 1 6 "Bring up docker"
#   scas_ok "Docker is running"
#   scas_panel_open "OPERATOR CONSOLE"
#   scas_panel_row "Dashboard" "http://localhost:3100"
#   scas_panel_close

# Idempotent
if [[ "${SCAS_TERM_LOADED:-}" = "1" ]]; then
  return 0 2>/dev/null || true
fi
SCAS_TERM_LOADED=1

_scas_term_width() {
  local w="${COLUMNS:-}"
  if [[ -z "$w" ]] && command -v tput >/dev/null 2>&1; then
    w="$(tput cols 2>/dev/null || true)"
  fi
  if [[ -z "$w" || "$w" -lt 48 ]]; then
    w=72
  elif [[ "$w" -gt 100 ]]; then
    w=100
  fi
  printf '%s' "$w"
}

_scas_term_color_ok() {
  if [[ "${NO_COLOR:-}" != "" ]]; then
    return 1
  fi
  if [[ "${SCAS_TERM:-}" = "plain" || "${SCAS_TERM:-}" = "off" ]]; then
    return 1
  fi
  if [[ ! -t 1 ]]; then
    return 1
  fi
  return 0
}

_scas_term_init() {
  SCAS_W="$(_scas_term_width)"
  if _scas_term_color_ok; then
    # Phosphor green console with cyan / amber / red accents (256-color)
    SCAS_R=$'\033[0m'
    SCAS_BOLD=$'\033[1m'
    SCAS_DIM=$'\033[2m'
    SCAS_GREEN=$'\033[38;5;46m'
    SCAS_LGREEN=$'\033[38;5;118m'
    SCAS_CYAN=$'\033[38;5;51m'
    SCAS_MAGENTA=$'\033[38;5;201m'
    SCAS_AMBER=$'\033[38;5;214m'
    SCAS_RED=$'\033[38;5;196m'
    SCAS_WHITE=$'\033[38;5;255m'
    SCAS_GRAY=$'\033[38;5;245m'
  else
    SCAS_R=''
    SCAS_BOLD=''
    SCAS_DIM=''
    SCAS_GREEN=''
    SCAS_LGREEN=''
    SCAS_CYAN=''
    SCAS_MAGENTA=''
    SCAS_AMBER=''
    SCAS_RED=''
    SCAS_WHITE=''
    SCAS_GRAY=''
  fi
}

_scas_term_init

# Repeat a character N times (bash 3.2 safe)
_scas_rep() {
  local ch="$1" n="$2" out="" i=0
  while [[ $i -lt $n ]]; do
    out+="$ch"
    i=$((i + 1))
  done
  printf '%s' "$out"
}

scas_hr() {
  local ch="${1:--}"
  printf '%s%s%s\n' "${SCAS_DIM}${SCAS_GREEN}" "$(_scas_rep "$ch" "$SCAS_W")" "${SCAS_R}"
}

scas_banner() {
  local subtitle="${1:-localhost supply-chain attack labs}"
  local host_line
  host_line="$(hostname 2>/dev/null || printf 'localhost')"
  printf '\n'
  printf '%s' "${SCAS_GREEN}${SCAS_BOLD}"
  cat <<'EOF'
   ███████╗ ██████╗ █████╗ ███████╗
   ██╔════╝██╔════╝██╔══██╗██╔════╝
   ███████╗██║     ███████║███████╗
   ╚════██║██║     ██╔══██║╚════██║
   ███████║╚██████╗██║  ██║███████║
   ╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝
EOF
  printf '%s' "${SCAS_R}"
  printf '  %s%s%s\n' "${SCAS_CYAN}" "SUPPLY CHAIN ATTACK SIMULATOR" "${SCAS_R}"
  printf '  %s%s%s\n' "${SCAS_DIM}${SCAS_LGREEN}" "// ${subtitle}" "${SCAS_R}"
  printf '  %snode %s · host %s%s\n' \
    "${SCAS_GRAY}" \
    "$(command -v node >/dev/null 2>&1 && node -v 2>/dev/null || echo '?')" \
    "$host_line" \
    "${SCAS_R}"
  scas_hr '─'
  printf '  %s[%s*%s] testbench rails armed · exfil stays on 127.0.0.1%s\n' \
    "${SCAS_DIM}" "${SCAS_MAGENTA}" "${SCAS_DIM}" "${SCAS_R}"
  printf '\n'
}

scas_stage() {
  # scas_stage INDEX TOTAL "title"   OR   scas_stage "title"
  local index="" total="" title=""
  if [[ $# -ge 3 ]]; then
    index="$1"
    total="$2"
    title="$3"
  else
    title="$1"
  fi
  printf '\n'
  if [[ -n "$index" ]]; then
    printf '%s%s[%s◆%s STAGE %02d/%02d ]%s %s%s%s\n' \
      "${SCAS_BOLD}" "${SCAS_CYAN}" "${SCAS_MAGENTA}" "${SCAS_CYAN}" \
      "$index" "$total" "${SCAS_R}" \
      "${SCAS_WHITE}${SCAS_BOLD}" "$title" "${SCAS_R}"
  else
    printf '%s%s[%s▶%s]%s %s%s%s\n' \
      "${SCAS_BOLD}" "${SCAS_CYAN}" "${SCAS_GREEN}" "${SCAS_CYAN}" "${SCAS_R}" \
      "${SCAS_WHITE}${SCAS_BOLD}" "$title" "${SCAS_R}"
  fi
  printf '  %s%s%s\n' "${SCAS_DIM}${SCAS_GREEN}" "$(_scas_rep '·' $((SCAS_W - 2)))" "${SCAS_R}"
}

scas_log() {
  printf '  %s%s··%s %s\n' "${SCAS_DIM}" "${SCAS_CYAN}" "${SCAS_R}" "$*"
}

scas_ok() {
  printf '  %s%s[OK]%s %s\n' "${SCAS_BOLD}" "${SCAS_GREEN}" "${SCAS_R}" "$*"
}

scas_warn() {
  printf '  %s%s[!!]%s %s\n' "${SCAS_BOLD}" "${SCAS_AMBER}" "${SCAS_R}" "$*" >&2
}

scas_fail() {
  printf '  %s%s[XX]%s %s\n' "${SCAS_BOLD}" "${SCAS_RED}" "${SCAS_R}" "$*" >&2
}

scas_info() {
  printf '  %s%s[--]%s %s\n' "${SCAS_DIM}" "${SCAS_CYAN}" "${SCAS_R}" "$*"
}

scas_dim() {
  printf '  %s%s%s\n' "${SCAS_DIM}${SCAS_GRAY}" "$*" "${SCAS_R}"
}

scas_kv() {
  local key="$1" val="$2"
  printf '  %s%-14s%s %s%s%s\n' "${SCAS_CYAN}" "$key" "${SCAS_R}" "${SCAS_LGREEN}" "$val" "${SCAS_R}"
}

# Panel: bordered block for final URLs / status
scas_panel_open() {
  local title="${1:-STATUS}"
  local inner=$((SCAS_W - 2))
  local title_len=${#title}
  # "─ TITLE " eats 3 + title_len; rest is fill before ┐
  local pad=$((inner - title_len - 3))
  if [[ $pad -lt 1 ]]; then pad=1; fi
  printf '\n'
  printf '%s┌─ %s%s%s %s┐%s\n' \
    "${SCAS_GREEN}" "${SCAS_BOLD}${SCAS_WHITE}" "$title" "${SCAS_R}${SCAS_GREEN}" \
    "$(_scas_rep '─' "$pad")" "${SCAS_R}"
}

_scas_panel_line() {
  # Visible text length (no ANSI) must fit inside width-2; pad + close with │
  local visible="$1"
  local colored="$2"
  local inner=$((SCAS_W - 2))
  local len=${#visible}
  local pad=$((inner - len))
  if [[ $pad -lt 0 ]]; then
    visible="${visible:0:inner}"
    colored="$visible"
    pad=0
  fi
  printf '%s│%s%s%s%s│%s\n' \
    "${SCAS_GREEN}" "${SCAS_R}" "$colored" "$(_scas_rep ' ' "$pad")" "${SCAS_GREEN}" "${SCAS_R}"
}

scas_panel_row() {
  local key="$1" val="$2"
  local key_w=14
  local visible
  visible="$(printf ' %-*s %s' "$key_w" "$key" "$val")"
  local colored
  colored="$(printf ' %s%-*s%s %s%s%s' \
    "${SCAS_CYAN}" "$key_w" "$key" "${SCAS_R}" \
    "${SCAS_LGREEN}" "$val" "${SCAS_R}")"
  _scas_panel_line "$visible" "$colored"
}

scas_panel_note() {
  local text=" $*"
  local colored
  colored="$(printf ' %s%s%s' "${SCAS_DIM}${SCAS_GRAY}" "$*" "${SCAS_R}")"
  _scas_panel_line "$text" "$colored"
}

scas_panel_blank() {
  _scas_panel_line " " " "
}

scas_panel_close() {
  local inner=$((SCAS_W - 2))
  printf '%s└%s┘%s\n' "${SCAS_GREEN}" "$(_scas_rep '─' "$inner")" "${SCAS_R}"
  printf '\n'
}

scas_boot_footer() {
  printf '%s  %sctrl-c%s tears the stack down · leave this TTY open while you train%s\n\n' \
    "${SCAS_DIM}" "${SCAS_AMBER}" "${SCAS_DIM}" "${SCAS_R}"
}
