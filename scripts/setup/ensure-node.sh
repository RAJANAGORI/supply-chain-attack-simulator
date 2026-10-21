#!/usr/bin/env bash
# Install Node with nvm when node/npm are missing or older than 16.
# Version comes from .nvmrc. Source this file (./run.sh does) so the
# nvm PATH stays in the shell that starts the stack.
# shellcheck shell=bash

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  set -euo pipefail
fi

NVM_VERSION="${SCAS_NVM_VERSION:-v0.40.8}"
NVM_DIR="${NVM_DIR:-${HOME:-}/.nvm}"
SCAS_NODE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

scas_node_log() { printf '▶ %s\n' "$*"; }
scas_node_ok()  { printf '✓ %s\n' "$*"; }
scas_node_err() { printf '✗ %s\n' "$*" >&2; }

scas_node_ok_version() {
  command -v node >/dev/null 2>&1 || return 1
  command -v npm >/dev/null 2>&1 || return 1
  local major
  major="$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)"
  [[ -n "${major}" && "${major}" -ge 16 ]]
}

scas_node_load_nvm() {
  [[ -n "${NVM_DIR}" && -s "${NVM_DIR}/nvm.sh" ]] || return 1
  local flags="$-"
  set +eu
  # shellcheck disable=SC1090
  . "${NVM_DIR}/nvm.sh"
  [[ "${flags}" == *e* ]] && set -e
  [[ "${flags}" == *u* ]] && set -u
  command -v nvm >/dev/null 2>&1
}

scas_node_wanted() {
  if [[ -f "${SCAS_NODE_ROOT}/.nvmrc" ]]; then
    tr -d '[:space:]' < "${SCAS_NODE_ROOT}/.nvmrc"
  else
    printf '%s\n' "20.19.0"
  fi
}

scas_node_install_nvm() {
  if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
    return 0
  fi
  if ! command -v curl >/dev/null 2>&1; then
    scas_node_err "curl is required to install nvm."
    return 1
  fi
  scas_node_log "Installing nvm ${NVM_VERSION}"
  export NVM_DIR
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
}

scas_ensure_node() {
  if scas_node_ok_version; then
    return 0
  fi
  if scas_node_load_nvm && scas_node_ok_version; then
    return 0
  fi

  local want
  want="$(scas_node_wanted)"
  scas_node_log "Node.js is missing. Installing ${want} with nvm."
  scas_node_install_nvm
  if ! scas_node_load_nvm; then
    scas_node_err "nvm did not install into ${NVM_DIR}."
    return 1
  fi
  nvm install "${want}"
  nvm alias default "${want}"
  nvm use "${want}"
  if ! scas_node_ok_version; then
    scas_node_err "Node.js ${want} installed, but node and npm are still not on PATH."
    return 1
  fi
  scas_node_ok "Node.js $(node -v) (npm $(npm -v))"
}

scas_ensure_node
