#!/usr/bin/env bash
# Plant lookalike credential fixtures for harvest labs (LAB ONLY).
# Usage:
#   ./scenarios/_shared/plant-lookalike-secrets.sh 06
#
# SCAS-FP-RN-8d4f2c9a1e7b3065

set -euo pipefail

SHARED_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SHARED_DIR}/../.." && pwd)"
LOOKALIKE_ENV="${SHARED_DIR}/lookalike-secrets.env"
SCENARIO_ID="${1:?usage: plant-lookalike-secrets.sh <scenario-id e.g. 05|06|23>}"

# shellcheck disable=SC1091
source "${SHARED_DIR}/ensure-lookalike-secrets.sh"

scas_lookalike_get() {
  local key="${1:?}"
  local line
  line="$(grep -E "^export ${key}=" "${LOOKALIKE_ENV}" | head -1 || true)"
  if [ -z "$line" ]; then
    echo ""
    return 0
  fi
  printf '%s' "${line#export ${key}=}"
}

NPM_TOKEN="$(scas_lookalike_get NPM_TOKEN)"
GITHUB_TOKEN="$(scas_lookalike_get GITHUB_TOKEN)"
AWS_ACCESS_KEY_ID="$(scas_lookalike_get AWS_ACCESS_KEY_ID)"
AWS_SECRET_ACCESS_KEY="$(scas_lookalike_get AWS_SECRET_ACCESS_KEY)"
DATABASE_URL="$(scas_lookalike_get DATABASE_URL)"
DATABASE_PASSWORD="$(scas_lookalike_get DATABASE_PASSWORD)"
DOCKER_PASSWORD="$(scas_lookalike_get DOCKER_PASSWORD)"
DOCKER_USERNAME="$(scas_lookalike_get DOCKER_USERNAME)"

case "$SCENARIO_ID" in
  05|5)
    VICTIM="${REPO_ROOT}/scenarios/05-build-compromise/victim-app"
    mkdir -p "$VICTIM"
    cat >"${VICTIM}/.env.lab" <<EOF
# LAB ONLY - generated lookalike secrets (do not commit)
GITHUB_TOKEN=${GITHUB_TOKEN}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
DATABASE_PASSWORD=${DATABASE_PASSWORD}
DATABASE_URL=${DATABASE_URL}
EOF
    echo "   Planted ${VICTIM}/.env.lab"
    ;;
  06|6)
    VICTIM="${REPO_ROOT}/scenarios/06-sha-hulud/victim-app"
    mkdir -p "$VICTIM"
    cat >"${VICTIM}/.npmrc" <<EOF
# LAB ONLY - lookalike npm token for Shai-Hulud harvest demo
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
EOF
    cat >"${VICTIM}/.env" <<EOF
# LAB ONLY - lookalike secrets for credential harvest (gitignored)
NPM_TOKEN=${NPM_TOKEN}
GITHUB_TOKEN=${GITHUB_TOKEN}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AZURE_CLIENT_SECRET=$(scas_lookalike_get AZURE_CLIENT_SECRET)
EOF
    echo "   Planted ${VICTIM}/.npmrc and ${VICTIM}/.env"
    ;;
  21)
    VICTIM="${REPO_ROOT}/scenarios/21-axios-compromised-release-attack"
    mkdir -p "${VICTIM}/victim-app" 2>/dev/null || true
    if [ -d "${VICTIM}/victim-app" ]; then
      cat >"${VICTIM}/victim-app/.env" <<EOF
# LAB ONLY
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
NPM_TOKEN=${NPM_TOKEN}
EOF
      echo "   Planted ${VICTIM}/victim-app/.env"
    fi
    ;;
  23)
    VICTIM="${REPO_ROOT}/scenarios/23-trivy-supply-chain-attack"
    mkdir -p "$VICTIM"
    cat >"${VICTIM}/.env.ci-lab" <<EOF
# LAB ONLY - source before running malicious trivy-action harvest
GITHUB_TOKEN=${GITHUB_TOKEN}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
DATABASE_URL=${DATABASE_URL}
DOCKER_USERNAME=${DOCKER_USERNAME}
DOCKER_PASSWORD=${DOCKER_PASSWORD}
EOF
    echo "   Planted ${VICTIM}/.env.ci-lab"
    ;;
  25)
    VICTIM="${REPO_ROOT}/scenarios/25-compromised-github-action"
    mkdir -p "$VICTIM"
    cat >"${VICTIM}/.env.ci-lab" <<EOF
# LAB ONLY - source before running the compromised action harvest
GITHUB_TOKEN=${GITHUB_TOKEN}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
DATABASE_URL=${DATABASE_URL}
DOCKER_USERNAME=${DOCKER_USERNAME}
DOCKER_PASSWORD=${DOCKER_PASSWORD}
EOF
    echo "   Planted ${VICTIM}/.env.ci-lab"
    ;;
  *)
    echo "No lookalike victim fixtures for scenario ${SCENARIO_ID} (shared env still applies)." >&2
    ;;
esac
