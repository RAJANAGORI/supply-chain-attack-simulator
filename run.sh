#!/usr/bin/env bash
# Full SCAS stack. Installs Node from .nvmrc with nvm, then Docker, if either is missing.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

needs_docker=1
skip_es=0
skip_floci=0
for arg in "$@"; do
  case "$arg" in
    -h|--help)
      exec "${ROOT}/scripts/ui/run-everything.sh" "$@"
      ;;
    --core-only) needs_docker=0 ;;
    --skip-es) skip_es=1 ;;
    --skip-floci) skip_floci=1 ;;
  esac
done
if [[ "$skip_es" == 1 && "$skip_floci" == 1 ]]; then
  needs_docker=0
fi

# shellcheck disable=SC1091
source "${ROOT}/scripts/setup/ensure-node.sh"

if [[ -d /Applications/Docker.app/Contents/Resources/bin ]]; then
  export PATH="/Applications/Docker.app/Contents/Resources/bin:${PATH}"
fi

if [[ "$needs_docker" == 1 ]]; then
  set +e
  "${ROOT}/scripts/setup/ensure-docker.sh"
  docker_rc=$?
  set -e
  if [[ "$docker_rc" -eq 10 ]]; then
    if [[ "${SCAS_DOCKER_SG_REEXEC:-}" == 1 ]]; then
      printf '✗ Joined the docker group and Docker still refused the socket.\n' >&2
      exit 1
    fi
    export SCAS_DOCKER_SG_REEXEC=1
    exec sg docker -c "$(printf '%q ' "${ROOT}/scripts/ui/run-everything.sh" "$@")"
  fi
  if [[ "$docker_rc" -ne 0 ]]; then
    exit "$docker_rc"
  fi
fi

exec "${ROOT}/scripts/ui/run-everything.sh" "$@"
