#!/usr/bin/env bash
# Push locally built image to Floci ECR (optional Floci track).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

[ "${TESTBENCH_MODE:-}" = "enabled" ] || { echo "Set TESTBENCH_MODE=enabled"; exit 1; }
[ "${SCAS_FLOCI_ENABLED:-}" = "1" ] || { echo "Set SCAS_FLOCI_ENABLED=1"; exit 1; }

scas_floci_require
REPO="$(scas_floci_ecr_repo_for_scenario 14)"
scas_floci_ecr_create "$REPO"
URI="$(scas_floci_ecr_uri "$REPO")"
TAG="${URI}:compromised"

if ! docker image inspect scas-compromised >/dev/null 2>&1; then
  echo "Build first: docker build -t scas-compromised images/compromised-image"
  exit 1
fi

REGISTRY="000000000000.dkr.ecr.${SCAS_FLOCI_REGION}.localhost:5100"
PASS="$(scas_floci_aws ecr get-login-password)"
echo "$PASS" | docker login --username AWS --password-stdin "$REGISTRY"

docker tag scas-compromised "$TAG"
docker push "$TAG"

BUCKET="$(scas_floci_bucket_for_scenario 14)"
scas_floci_s3_put_string "$BUCKET" "ecr/pushed-at.txt" <<< "pushed ${TAG} at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "[FLOCI] Pushed $TAG"
