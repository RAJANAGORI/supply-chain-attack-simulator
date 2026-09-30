#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
# Scenario 25: run ci.yml locally with nektos/act, or fall back to npm start.
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCENARIO_DIR}/../_shared/enable-testbench.sh"

SECRET_FILE_ARGS=()
if [[ -f "${SCENARIO_DIR}/.env.ci-lab" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${SCENARIO_DIR}/.env.ci-lab"
  set +a
  SECRET_FILE_ARGS=(--secret-file "${SCENARIO_DIR}/.env.ci-lab")
fi

# uses: example/actions/checkout@v3 is owner/repo/path@ref, so act looks up
# example/actions@v3 and then the checkout/ subdirectory.
exec "${SCENARIO_DIR}/../_shared/run-act.sh" \
  --dir "${SCENARIO_DIR}/victim-app" \
  --workflow ".github/workflows/ci.yml" \
  --event push \
  --local-repository "example/actions@v3=.github/actions" \
  --local-repository "https://github.com/example/actions@v3=.github/actions" \
  "${SECRET_FILE_ARGS[@]}" \
  --env TESTBENCH_MODE \
  --env GITHUB_TOKEN \
  --env AWS_ACCESS_KEY_ID \
  --env AWS_SECRET_ACCESS_KEY \
  --env DATABASE_URL \
  --env DOCKER_USERNAME \
  --env DOCKER_PASSWORD \
  --secret GITHUB_TOKEN \
  --secret AWS_ACCESS_KEY_ID \
  --secret AWS_SECRET_ACCESS_KEY \
  --secret DATABASE_URL \
  --secret DOCKER_USERNAME \
  --secret DOCKER_PASSWORD \
  --fallback "npm start"
