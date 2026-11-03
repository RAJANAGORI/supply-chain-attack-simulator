#!/bin/bash

# SCAS-FP-RN-8d4f2c9a1e7b3065 — Supply Chain Attack Simulator © Raja Nagori
# Main Setup Script for Supply Chain Attack Testbench
# This script prepares the entire environment
#
# Safe to run from any cwd: paths are resolved from the repo root (parent of this script).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"
TESTBENCH_ENV_FILE="${REPO_ROOT}/.testbench.env"

# shellcheck source=scripts/lib/scas-term.sh
source "${REPO_ROOT}/scripts/lib/scas-term.sh"

if [[ "${SCAS_FROM_RUN:-}" != "1" ]]; then
  scas_banner "testbench bootstrap"
else
  scas_log "TESTBENCH bootstrap (nested under ./run.sh)"
fi

scas_log "Checking system requirements…"
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${OS}"
esac
scas_kv "OS" "${MACHINE}"

scas_log "Checking prerequisites…"

MISSING_DEPS=()

# Node comes from nvm when it is not already on PATH (.nvmrc).
# shellcheck disable=SC1091
source "${REPO_ROOT}/scripts/setup/ensure-node.sh"

if ! command -v node &> /dev/null; then
    scas_fail "Node.js not found"
    MISSING_DEPS+=("Node.js 16+")
else
    scas_ok "Node.js: $(node --version)"
fi

if ! command -v npm &> /dev/null; then
    scas_fail "npm not found"
    MISSING_DEPS+=("npm")
else
    scas_ok "npm: $(npm --version)"
fi

if ! command -v python3 &> /dev/null; then
    scas_fail "Python 3 not found"
    MISSING_DEPS+=("Python 3.8+")
else
    scas_ok "Python3: $(python3 --version | awk '{print $2}')"
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    scas_fail "Missing required dependencies:"
    for dep in "${MISSING_DEPS[@]}"; do
        scas_dim "- $dep"
    done
    scas_warn "Install the missing dependencies and run this script again."
    exit 1
fi

scas_hr '─'
scas_info "This script sets up the Supply Chain Attack Testbench."
scas_info "It creates directories, installs deps, and arms the learning env."
scas_warn "Intentionally vulnerable code - educational use only."
scas_hr '─'

# Noninteractive: CI=1, SCAS_YES=1, or no TTY (piped / automation)
if [[ "${CI:-}" = "1" || "${SCAS_YES:-}" = "1" || ! -t 0 ]]; then
    REPLY=y
    scas_log "Continue? y  [noninteractive]"
else
    printf '  %sContinue? (y/N):%s ' "${SCAS_AMBER}${SCAS_BOLD}" "${SCAS_R}"
    read -r -n 1 REPLY
    echo ""
fi
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    scas_warn "Setup cancelled."
    exit 1
fi

scas_log "Configuring environment…"
export TESTBENCH_MODE=enabled
if [ ! -f "${TESTBENCH_ENV_FILE}" ] || ! grep -q '^export TESTBENCH_MODE=enabled$' "${TESTBENCH_ENV_FILE}"; then
    cat > "${TESTBENCH_ENV_FILE}" << 'EOF'
export TESTBENCH_MODE=enabled
EOF
fi
scas_ok "TESTBENCH_MODE enabled for current shell"
scas_ok "Persistent env file: ${TESTBENCH_ENV_FILE}"
scas_dim "Add once to your shell profile:"
scas_dim "[ -f \"${TESTBENCH_ENV_FILE}\" ] && source \"${TESTBENCH_ENV_FILE}\""

scas_log "Making setup scripts executable…"
find scenarios -name "setup.sh" -type f -exec chmod +x {} \;
scas_ok "Scripts configured"

scas_log "Creating directory structure…"
mkdir -p logs
mkdir -p detection-tools
mkdir -p docs
scas_ok "Directories created"

scas_panel_open "SETUP COMPLETE"
scas_panel_note "TESTBENCH_MODE=enabled · localhost labs only"
if [[ "${SCAS_FROM_RUN:-}" = "1" ]]; then
  scas_panel_note "Handing control back to ./run.sh for the rest of the stack."
else
  scas_panel_blank
  scas_panel_note "Next moves"
  scas_panel_row "Lab 01" "cd scenarios/01-typosquatting && cat README.md && ./setup.sh"
  scas_panel_row "Docs" "cat documentation/getting-started/SETUP.md"
  scas_panel_row "Env" "source .testbench.env"
  scas_panel_row "Teardown" "./scripts/setup/teardown.sh"
  scas_panel_row "Floci" "./scripts/floci/floci-setup.sh && ./scripts/floci/floci-up.sh"
  scas_panel_blank
  scas_panel_note "Educational only. Never ship malicious code to production."
  scas_panel_note "Always keep TESTBENCH_MODE=enabled for lab payloads."
fi
scas_panel_close
