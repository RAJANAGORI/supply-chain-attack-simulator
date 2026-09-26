#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
# Shared nektos/act runner for GitHub Actions labs (05, 25, and similar).
#
# Runs the real workflow YAML on the host. Remote uses: owner/repo@ref lines are
# mapped to local folders so act never fetches from GitHub. Exfil still goes to
# 127.0.0.1 only, and payloads stay gated on TESTBENCH_MODE=enabled.
#
# Docker is not required. Jobs use -P ubuntu-latest=-self-hosted so the mock
# server on localhost is reachable and we do not pull ubuntu images.
#
# If act is missing, too old, or the run fails, --fallback (npm start / npm run ci)
# keeps the lab working.
#
# Usage:
#   run-act.sh \
#     --dir victim-app \
#     --workflow .github/workflows/ci.yml \
#     --local-repository example/actions/checkout@v3=.github/actions/checkout \
#     --env TESTBENCH_MODE \
#     --secret GITHUB_TOKEN \
#     --fallback "npm start"
#
# Optional: SCAS_SKIP_ACT=1 forces the Node simulator.
# Optional: SCAS_ACT_REQUIRED=1 fails instead of falling back when act errors.

set -euo pipefail

WORKDIR=""
WORKFLOW=""
EVENT="push"
FALLBACK=""
JOB=""
SECRET_FILE=""
LOCAL_REPOS=()
ENV_NAMES=()
SECRET_NAMES=()

usage() {
  sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) WORKDIR="$2"; shift 2 ;;
    --workflow) WORKFLOW="$2"; shift 2 ;;
    --event) EVENT="$2"; shift 2 ;;
    --job) JOB="$2"; shift 2 ;;
    --fallback) FALLBACK="$2"; shift 2 ;;
    --secret-file) SECRET_FILE="$2"; shift 2 ;;
    --local-repository) LOCAL_REPOS+=("$2"); shift 2 ;;
    --env) ENV_NAMES+=("$2"); shift 2 ;;
    --secret) SECRET_NAMES+=("$2"); shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$WORKDIR" || -z "$WORKFLOW" ]]; then
  echo "run-act.sh: --dir and --workflow are required." >&2
  exit 2
fi

if [[ ! -d "$WORKDIR" ]]; then
  echo "run-act.sh: --dir is not a directory: $WORKDIR" >&2
  exit 2
fi

WORKDIR="$(cd "$WORKDIR" && pwd)"

run_fallback() {
  if [[ -z "$FALLBACK" ]]; then
    echo "act was not used and no --fallback command was given." >&2
    return 1
  fi
  echo "Using Node CI simulator: ${FALLBACK}"
  (cd "$WORKDIR" && bash -lc "$FALLBACK")
}

abs_local_path() {
  local rel="$1"
  if [[ "$rel" == /* ]]; then
    printf '%s' "$rel"
    return 0
  fi
  local parent
  parent="$(cd "$WORKDIR" && cd "$(dirname "$rel")" && pwd)"
  printf '%s/%s' "$parent" "$(basename "$rel")"
}

act_ready() {
  command -v act >/dev/null 2>&1 || return 1
  act --help 2>/dev/null | grep -q -- '--local-repository' || return 1
  return 0
}

if [[ "${SCAS_SKIP_ACT:-}" == "1" ]]; then
  echo "SCAS_SKIP_ACT=1: skipping nektos/act."
  run_fallback
  exit $?
fi

if ! act_ready; then
  echo "nektos/act not found, or too old for --local-repository."
  echo "Optional install: brew install act"
  echo "  https://github.com/nektos/act#installation"
  run_fallback
  exit $?
fi

ACT_CACHE="${SCAS_ACT_CACHE:-${TMPDIR:-/tmp}/scas-act-cache}"
mkdir -p "$ACT_CACHE"

ACT_ARGS=(
  "$EVENT"
  -W "$WORKFLOW"
  -P "ubuntu-latest=-self-hosted"
  --action-offline-mode
  --action-cache-path "$ACT_CACHE"
  --bind
)

if [[ -n "$JOB" ]]; then
  ACT_ARGS+=(-j "$JOB")
fi

for spec in "${LOCAL_REPOS[@]+"${LOCAL_REPOS[@]}"}"; do
  key="${spec%%=*}"
  rel="${spec#*=}"
  if [[ -z "$key" || "$key" == "$spec" || -z "$rel" ]]; then
    echo "run-act.sh: --local-repository must be owner/repo@ref=/path (got: $spec)" >&2
    exit 2
  fi
  abs="$(abs_local_path "$rel")"
  if [[ ! -d "$abs" ]]; then
    echo "run-act.sh: local action path does not exist: $abs" >&2
    exit 2
  fi
  ACT_ARGS+=(--local-repository "${key}=${abs}")
done

if [[ -n "$SECRET_FILE" ]]; then
  if [[ ! -f "$SECRET_FILE" ]]; then
    echo "run-act.sh: --secret-file not found: $SECRET_FILE" >&2
    exit 2
  fi
  ACT_ARGS+=(--secret-file "$SECRET_FILE")
fi

for name in "${ENV_NAMES[@]+"${ENV_NAMES[@]}"}"; do
  ACT_ARGS+=(--env "${name}=${!name-}")
done

for name in "${SECRET_NAMES[@]+"${SECRET_NAMES[@]}"}"; do
  ACT_ARGS+=(--secret "${name}=${!name-}")
done

if [[ -z "${TESTBENCH_MODE:-}" ]]; then
  export TESTBENCH_MODE=enabled
fi
ACT_ARGS+=(--env "TESTBENCH_MODE=${TESTBENCH_MODE}")

echo "Running ${WORKFLOW} with nektos/act $(act --version 2>/dev/null | head -1)"
echo "  host runner (no Docker image), local action map, no GitHub fetch"
echo "  workspace: ${WORKDIR}"

set +e
(cd "$WORKDIR" && act "${ACT_ARGS[@]}")
act_rc=$?
set -e

if [[ $act_rc -eq 0 ]]; then
  echo "act finished."
  exit 0
fi

echo "act exited ${act_rc}."
if [[ "${SCAS_ACT_REQUIRED:-}" == "1" ]]; then
  echo "SCAS_ACT_REQUIRED=1: not falling back to the Node simulator." >&2
  exit "$act_rc"
fi

echo "Falling back to the Node CI simulator."
run_fallback
