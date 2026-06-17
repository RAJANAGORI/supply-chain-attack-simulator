#!/usr/bin/env bash
# SCAS ↔ Floci bridge — shared helpers for optional AWS emulator integration.
# Requires Floci on http://localhost:4566 (see infrastructure/floci/ + scripts/floci-up.sh).
#
# Usage:
#   source "$(git rev-parse --show-toplevel)/scripts/floci-bridge.sh"
#   scas_floci_require
#   scas_floci_seed_scenario 05

set -euo pipefail

SCAS_FLOCI_ENDPOINT="${SCAS_FLOCI_ENDPOINT:-${AWS_ENDPOINT_URL:-http://127.0.0.1:4566}}"
SCAS_FLOCI_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
# Emulator auth only — never reuse lab "leaked" AWS_* from compromised-build exports.
SCAS_FLOCI_ACCESS_KEY="${SCAS_FLOCI_AWS_ACCESS_KEY_ID:-test}"
SCAS_FLOCI_SECRET_KEY="${SCAS_FLOCI_AWS_SECRET_ACCESS_KEY:-test}"

scas_floci_env() {
  export AWS_ENDPOINT_URL="$SCAS_FLOCI_ENDPOINT"
  export AWS_ACCESS_KEY_ID="$SCAS_FLOCI_ACCESS_KEY"
  export AWS_SECRET_ACCESS_KEY="$SCAS_FLOCI_SECRET_KEY"
  export AWS_DEFAULT_REGION="$SCAS_FLOCI_REGION"
}

scas_floci_health() {
  curl -fsS "${SCAS_FLOCI_ENDPOINT}/_floci/health" >/dev/null 2>&1
}

scas_floci_init_ready() {
  local body
  body="$(curl -fsS "${SCAS_FLOCI_ENDPOINT}/_floci/init" 2>/dev/null)" || return 1
  python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("completed",{}).get("ready") else 1)' <<<"$body" 2>/dev/null
}

scas_floci_wait_init() {
  local tries="${1:-90}"
  while [ "$tries" -gt 0 ]; do
    if scas_floci_init_ready; then
      return 0
    fi
    tries=$((tries - 1))
    sleep 1
  done
  echo "❌ Floci health OK but init not ready (/_floci/init)." >&2
  echo "   Logs: docker logs scas-floci --tail 80" >&2
  return 1
}

scas_floci_require() {
  if ! scas_floci_health; then
    echo "❌ Floci is not reachable at ${SCAS_FLOCI_ENDPOINT}" >&2
    echo "   One-time setup:  ./scripts/floci-setup.sh" >&2
    echo "   Start emulator:  ./scripts/floci-up.sh" >&2
    echo "   Load lab env:    source .floci.env" >&2
    return 1
  fi
  scas_floci_wait_init
}

scas_floci_container() {
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'scas-floci'; then
    echo 'scas-floci'
  elif docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'floci'; then
    echo 'floci'
  else
    echo ''
  fi
}

# Prefer aws inside the Floci container — avoids host CLI profile / path-style quirks.
scas_floci_aws_in_container() {
  local ctr="$1"
  shift
  docker exec \
    -e AWS_ENDPOINT_URL=http://127.0.0.1:4566 \
    -e AWS_ACCESS_KEY_ID="$SCAS_FLOCI_ACCESS_KEY" \
    -e AWS_SECRET_ACCESS_KEY="$SCAS_FLOCI_SECRET_KEY" \
    -e AWS_DEFAULT_REGION="$SCAS_FLOCI_REGION" \
    "$ctr" aws --region "$SCAS_FLOCI_REGION" "$@"
}

scas_floci_aws_in_container_stdin() {
  local ctr="$1"
  local dest="$2"
  docker exec -i \
    -e AWS_ENDPOINT_URL=http://127.0.0.1:4566 \
    -e AWS_ACCESS_KEY_ID="$SCAS_FLOCI_ACCESS_KEY" \
    -e AWS_SECRET_ACCESS_KEY="$SCAS_FLOCI_SECRET_KEY" \
    -e AWS_DEFAULT_REGION="$SCAS_FLOCI_REGION" \
    "$ctr" aws --region "$SCAS_FLOCI_REGION" s3 cp - "$dest"
}

scas_floci_aws_on_host() {
  scas_floci_env
  if command -v awslocal >/dev/null 2>&1; then
    env AWS_PROFILE= AWS_DEFAULT_PROFILE= AWS_EC2_METADATA_DISABLED=true \
      awslocal --region "$SCAS_FLOCI_REGION" "$@"
    return $?
  fi
  if command -v aws >/dev/null 2>&1; then
    env AWS_PROFILE= AWS_DEFAULT_PROFILE= AWS_EC2_METADATA_DISABLED=true \
      AWS_S3_FORCE_PATH_STYLE=true \
      aws --endpoint-url "$SCAS_FLOCI_ENDPOINT" --region "$SCAS_FLOCI_REGION" "$@"
    return $?
  fi
  return 127
}

# Run aws CLI against Floci: container aws → host awslocal/aws
scas_floci_aws() {
  local ctr
  ctr="$(scas_floci_container)"
  if [ -n "$ctr" ]; then
    scas_floci_aws_in_container "$ctr" "$@"
    return $?
  fi
  scas_floci_aws_on_host "$@"
}

scas_floci_bucket_for_scenario() {
  local id="${1:?scenario id}"
  printf 'scas-sc%02d-artifacts' "$id"
}

scas_floci_seed_scenario() {
  local id="${1:?scenario id}"
  local bucket
  bucket="$(scas_floci_bucket_for_scenario "$id")"
  scas_floci_require
  if ! scas_floci_aws s3 ls "s3://${bucket}" >/dev/null 2>&1; then
    scas_floci_aws s3 mb "s3://${bucket}" >/dev/null 2>&1
  fi
  echo "$bucket"
}

scas_floci_s3_put() {
  local bucket="${1:?bucket}"
  local key="${2:?key}"
  local file="${3:?file}"
  local abs ctr tmp_in_ctr
  abs="$(cd "$(dirname "$file")" && pwd)/$(basename "$file")"
  [ -f "$abs" ] || { echo "❌ missing file: $abs" >&2; return 1; }

  scas_floci_require

  ctr="$(scas_floci_container)"
  if [ -n "$ctr" ]; then
    tmp_in_ctr="/tmp/scas-upload-$$"
    # Prefer stdin — avoids docker cp permission issues (aws user cannot read root-only files).
    if scas_floci_aws_in_container_stdin "$ctr" "s3://${bucket}/${key}" <"$abs"; then
      return 0
    fi
    docker cp "$abs" "${ctr}:${tmp_in_ctr}"
    docker exec "$ctr" chmod a+r "$tmp_in_ctr" 2>/dev/null || true
    if scas_floci_aws_in_container "$ctr" s3 cp "$tmp_in_ctr" "s3://${bucket}/${key}"; then
      docker exec "$ctr" rm -f "$tmp_in_ctr" >/dev/null 2>&1 || true
      return 0
    fi
    docker exec "$ctr" rm -f "$tmp_in_ctr" >/dev/null 2>&1 || true
    echo "❌ Floci S3 upload failed (container aws)." >&2
    echo "   Try: ./scripts/floci-down.sh && rm -rf infrastructure/floci/data/* && ./scripts/floci-up.sh" >&2
    echo "   Logs: docker logs scas-floci --tail 80" >&2
    return 1
  fi

  if scas_floci_aws_on_host s3 cp "$abs" "s3://${bucket}/${key}"; then
    return 0
  fi
  echo "❌ Cannot upload $abs — start Floci (./scripts/floci-up.sh) or install aws CLI." >&2
  return 1
}

scas_floci_s3_put_string() {
  local bucket="${1:?bucket}"
  local key="${2:?key}"
  local tmp
  tmp="$(mktemp)"
  cat >"$tmp"
  scas_floci_s3_put "$bucket" "$key" "$tmp"
  rm -f "$tmp"
}

scas_floci_s3_ls() {
  local bucket="${1:?bucket}"
  local prefix="${2:-}"
  if [ -n "$prefix" ]; then
    scas_floci_aws s3 ls "s3://${bucket}/${prefix}"
  else
    scas_floci_aws s3 ls "s3://${bucket}/"
  fi
}

scas_floci_ecr_repo_for_scenario() {
  local id="${1:?scenario id}"
  printf 'scas-sc%02d-app' "$id"
}

scas_floci_ecr_create() {
  local repo="${1:?repository name}"
  scas_floci_aws ecr create-repository --repository-name "$repo" >/dev/null 2>&1 || true
}

scas_floci_ecr_uri() {
  local repo="${1:?repository name}"
  local account="${SCAS_FLOCI_ACCOUNT:-000000000000}"
  local region="${SCAS_FLOCI_REGION}"
  printf '%s.dkr.ecr.%s.localhost:5100/%s' "$account" "$region" "$repo"
}

scas_floci_secret_put() {
  local name="${1:?secret name}"
  local value="${2:?secret value}"
  scas_floci_aws secretsmanager create-secret --name "$name" --secret-string "$value" >/dev/null 2>&1 \
    || scas_floci_aws secretsmanager put-secret-value --secret-id "$name" --secret-string "$value" >/dev/null 2>&1 \
    || true
}
