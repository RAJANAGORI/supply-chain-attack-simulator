#!/usr/bin/env bash
# Ensure nektos/act is installed and supports --local-repository (labs 05 / 25).
#
# Usage:
#   ./scripts/setup/ensure-act.sh           # install if missing; exit 1 on failure
#   ./scripts/setup/ensure-act.sh --check   # only verify; non-zero if missing/old
#
# Install order: existing PATH -> Homebrew -> GitHub release tarball into
#   ${SCAS_ACT_BIN_DIR:-$REPO/.tools/bin}
#set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHECK_ONLY=0
ACT_BIN_DIR="${SCAS_ACT_BIN_DIR:-${ROOT}/.tools/bin}"

for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

log()  { printf '▶ %s\n' "$*"; }
ok()   { printf '✓ %s\n' "$*"; }
warn() { printf '! %s\n' "$*" >&2; }
err()  { printf '✗ %s\n' "$*" >&2; }

act_ready() {
  local bin="${1:-act}"
  command -v "$bin" >/dev/null 2>&1 || return 1
  # Prefer the named binary when given an absolute path
  if [[ "$bin" == /* ]]; then
    "$bin" --help 2>/dev/null | grep -q -- '--local-repository' || return 1
    return 0
  fi
  act --help 2>/dev/null | grep -q -- '--local-repository' || return 1
  return 0
}

print_act() {
  local bin
  bin="$(command -v act)"
  ok "nektos/act ready: $(act --version 2>/dev/null | head -1) (${bin})"
}

if act_ready; then
  print_act
  exit 0
fi

# Prefer repo-local install if present but not on PATH yet
if [[ -x "${ACT_BIN_DIR}/act" ]] && act_ready "${ACT_BIN_DIR}/act"; then
  export PATH="${ACT_BIN_DIR}:${PATH}"
  print_act
  exit 0
fi

if [[ "$CHECK_ONLY" = "1" ]]; then
  err "nektos/act missing or too old for --local-repository"
  exit 1
fi

log "Installing nektos/act (required for labs 05 and 25)…"

# 1) Homebrew
if command -v brew >/dev/null 2>&1; then
  log "Trying Homebrew: brew install act"
  if brew install act; then
    hash -r 2>/dev/null || true
    if act_ready; then
      print_act
      exit 0
    fi
    warn "brew install act finished but --local-repository is still missing; trying release binary"
  else
    warn "brew install act failed; trying GitHub release binary"
  fi
fi

# 2) GitHub release tarball
os="$(uname -s)"
arch="$(uname -m)"
case "$os" in
  Darwin) os_label="Darwin" ;;
  Linux) os_label="Linux" ;;
  *)
    err "Unsupported OS for automatic act install: $os"
    err "Install manually: https://github.com/nektos/act#installation"
    exit 1
    ;;
esac
case "$arch" in
  arm64|aarch64) arch_label="arm64" ;;
  x86_64|amd64) arch_label="x86_64" ;;
  *)
    err "Unsupported CPU for automatic act install: $arch"
    exit 1
    ;;
esac

asset="act_${os_label}_${arch_label}.tar.gz"
url="https://github.com/nektos/act/releases/latest/download/${asset}"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

log "Downloading ${url}"
if ! curl -fsSL --retry 3 --retry-delay 2 -o "${tmpdir}/${asset}" "$url"; then
  err "Failed to download act release asset"
  err "Install manually: https://github.com/nektos/act#installation"
  exit 1
fi

tar -xzf "${tmpdir}/${asset}" -C "$tmpdir"
if [[ ! -f "${tmpdir}/act" ]]; then
  err "act binary missing from ${asset}"
  exit 1
fi

mkdir -p "$ACT_BIN_DIR"
install -m 0755 "${tmpdir}/act" "${ACT_BIN_DIR}/act"
export PATH="${ACT_BIN_DIR}:${PATH}"

if ! act_ready "${ACT_BIN_DIR}/act"; then
  err "Installed act but --local-repository is unavailable"
  exit 1
fi

# Persist PATH hint for this repo (sourced by .scas.env / start-dashboard)
marker="${ROOT}/.tools/act.path"
printf '%s\n' "$ACT_BIN_DIR" >"$marker"

print_act
ok "Installed to ${ACT_BIN_DIR}/act (added to PATH for this session)"
exit 0
