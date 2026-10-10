#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
# Scenario 05: run build.yml locally with nektos/act, or fall back to npm run ci.
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_DIR="${SCENARIO_DIR}/../_shared"
# shellcheck disable=SC1091
source "${SHARED_DIR}/enable-testbench.sh"

if [[ -f "${SCENARIO_DIR}/victim-app/.env.lab" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${SCENARIO_DIR}/victim-app/.env.lab"
  set +a
fi

CHECKOUT_SHA="11bd71901bbe5b1630ceea73d27597364c9af683"
SETUP_NODE_SHA="1e60f620b9541d16bece96c5465dc8ee9832be0b"

SECRET_FILE_ARGS=()
if [[ -f "${SCENARIO_DIR}/victim-app/.env.lab" ]]; then
  SECRET_FILE_ARGS=(--secret-file "${SCENARIO_DIR}/victim-app/.env.lab")
fi

exec "${SHARED_DIR}/run-act.sh" \
  --dir "${SCENARIO_DIR}/victim-app" \
  --workflow ".github/workflows/build.yml" \
  --event push \
  --local-repository "vendor/build-action@v1=${SCENARIO_DIR}/malicious-action" \
  --local-repository "actions/checkout@${CHECKOUT_SHA}=${SHARED_DIR}/act-stubs/checkout" \
  --local-repository "actions/setup-node@${SETUP_NODE_SHA}=${SHARED_DIR}/act-stubs/setup-node" \
  "${SECRET_FILE_ARGS[@]}" \
  --env TESTBENCH_MODE \
  --env GITHUB_TOKEN \
  --env AWS_ACCESS_KEY_ID \
  --env AWS_SECRET_ACCESS_KEY \
  --env DATABASE_PASSWORD \
  --env DATABASE_URL \
  --secret GITHUB_TOKEN \
  --secret AWS_ACCESS_KEY_ID \
  --secret AWS_SECRET_ACCESS_KEY \
  --secret DATABASE_PASSWORD \
  --note "The step that matters is uses: vendor/build-action@v1. That tag is bound to malicious-action/." \
  --note "actions/checkout and actions/setup-node are SHA pins mapped to local stubs, so act can start the job without calling GitHub." \
  --fallback "npm run ci"
