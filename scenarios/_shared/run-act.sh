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
#     --note "one learner-facing sentence" \
#     --fallback "npm start"
#
# Optional: SCAS_SKIP_ACT=1 forces the Node simulator.
# Optional: SCAS_ACT_REQUIRED=1 fails instead of falling back when act errors.
# The command prints which uses: ref is bound to which folder before act's own log.

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
NOTES=()
MAP_KEYS=()
MAP_PATHS=()

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
    --note) NOTES+=("$2"); shift 2 ;;
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
  echo "Next command: ${FALLBACK}"
  echo "That command is a Node script. Step names it prints are the script, not act, and the workflow YAML is not executed."
  echo "--------"
  (cd "$WORKDIR" && bash -lc "$FALLBACK")
}

print_runner_banner() {
  local mode="$1"
  local reason="$2"
  echo ""
  echo "-------- SCAS runner: ${mode} --------"
  if [[ "$mode" == "nektos/act" ]]; then
    echo "act is a local GitHub Actions runner. It reads the workflow YAML and runs those steps on this machine."
    echo "Version: $(act --version 2>/dev/null | head -1)"
    echo "GitHub is not contacted. No Docker image is pulled (ubuntu-latest=-self-hosted)."
  else
    echo "nektos/act is not executing the workflow file."
    echo "Reason: ${reason}"
  fi
  echo "Workflow: ${WORKFLOW}"
  echo "Workspace: ${WORKDIR}"
  if [[ ${#MAP_KEYS[@]} -gt 0 ]]; then
    echo ""
    if [[ "$mode" == "nektos/act" ]]; then
      echo "uses: bindings (what act is responsible for in this lab):"
    else
      echo "uses: bindings act would have applied if it had run:"
    fi
    local i key shown
    for i in "${!MAP_KEYS[@]}"; do
      key="${MAP_KEYS[$i]}"
      shown="${MAP_PATHS[$i]}"
      if [[ "$shown" == "$WORKDIR"/* ]]; then
        shown="${shown#"$WORKDIR"/}"
      fi
      echo "  ${key}"
      echo "    folder: ${shown}"
    done
  fi
  if [[ ${#NOTES[@]} -gt 0 ]]; then
    echo ""
    echo "In this lab:"
    local note
    for note in "${NOTES[@]}"; do
      echo "  - ${note}"
    done
  fi
  if [[ "$mode" == "nektos/act" ]]; then
    echo "-------- act log starts --------"
  fi
  echo ""
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

# Prefer repo-local act from ensure-act.sh
if [[ -n "${SCAS_REPO_ROOT:-}" && -x "${SCAS_REPO_ROOT}/.tools/bin/act" ]]; then
  export PATH="${SCAS_REPO_ROOT}/.tools/bin:${PATH}"
elif [[ -x "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/.tools/bin/act" ]]; then
  export PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/.tools/bin:${PATH}"
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
  MAP_KEYS+=("$key")
  MAP_PATHS+=("$abs")
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

if [[ "${SCAS_SKIP_ACT:-}" == "1" ]]; then
  print_runner_banner "Node simulator" "SCAS_SKIP_ACT=1 is set, so the workflow file is skipped on purpose."
  run_fallback
  exit $?
fi

if ! act_ready; then
  echo "nektos/act not found, or too old for --local-repository."
  echo "Install: ./scripts/setup/ensure-act.sh"
  echo "  or: brew install act"
  echo "  https://github.com/nektos/act#installation"
  if [[ "${SCAS_ACT_REQUIRED:-}" == "1" ]]; then
    echo "SCAS_ACT_REQUIRED=1: refusing npm fallback. Fix act, or unset SCAS_ACT_REQUIRED / set SCAS_SKIP_ACT=1." >&2
    exit 1
  fi
  print_runner_banner "Node simulator" "nektos/act is missing, or too old to accept --local-repository."
  run_fallback
  exit $?
fi

print_runner_banner "nektos/act" ""

set +e
(cd "$WORKDIR" && act "${ACT_ARGS[@]}")
act_rc=$?
set -e

if [[ $act_rc -eq 0 ]]; then
  echo ""
  echo "-------- act finished --------"
  echo "nektos/act executed ${WORKFLOW}. The Node simulator did not run."
  echo "The uses: bindings above are the folders that actually ran."
  exit 0
fi

echo ""
echo "act exited ${act_rc}."
if [[ "${SCAS_ACT_REQUIRED:-}" == "1" ]]; then
  echo "SCAS_ACT_REQUIRED=1: refusing the Node simulator. Fix act, or unset SCAS_ACT_REQUIRED / set SCAS_SKIP_ACT=1." >&2
  exit "$act_rc"
fi

print_runner_banner "Node simulator" "act exited ${act_rc}, so the lab is continuing with the Node stand-in."
run_fallback
