#!/usr/bin/env bash
# Source from scenarios/NN-*/setup.sh after cd to the scenario directory.
# Loads repo .testbench.env (if present) and exports TESTBENCH_MODE=enabled.

_scas_shared_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_repo_root="$(cd "${_scas_shared_dir}/../.." && pwd)"

if [[ -f "${_repo_root}/.testbench.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${_repo_root}/.testbench.env"
  set +a
fi

export TESTBENCH_MODE=enabled
