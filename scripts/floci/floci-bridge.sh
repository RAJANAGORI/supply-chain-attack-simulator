#!/usr/bin/env bash
# SCAS ↔ Floci bridge — shared helpers for optional AWS emulator integration.
# Requires Floci on http://localhost:4566 (see infrastructure/floci/ + scripts/floci/floci-up.sh).
#
# Usage:
#   source "$(git rev-parse --show-toplevel)/scripts/floci/floci-bridge.sh"
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
  # Prefer configured endpoint; also try localhost if 127.0.0.1 fails (some hosts differ).
  local ep="${SCAS_FLOCI_ENDPOINT:-http://127.0.0.1:4566}"
  if curl -fsS --connect-timeout 2 --max-time 5 "${ep}/_floci/health" >/dev/null 2>&1; then
    return 0
  fi
  case "$ep" in
    *127.0.0.1*)
      curl -fsS --connect-timeout 2 --max-time 5 "http://localhost:4566/_floci/health" >/dev/null 2>&1
      ;;
    *localhost*)
      curl -fsS --connect-timeout 2 --max-time 5 "http://127.0.0.1:4566/_floci/health" >/dev/null 2>&1
      ;;
    *)
      return 1
      ;;
  esac
}

# Published floci/floci:* native images need ARM LSE (atomics). Cortex-A72 (Pi 4) lacks it.
scas_floci_native_image_supported() {
  case "$(uname -m)" in
    x86_64|amd64) return 0 ;;
    aarch64|arm64)
      if grep -Eiq '(^|[[:space:]])(atomics|lse)([[:space:]]|$)' /proc/cpuinfo 2>/dev/null; then
        return 0
      fi
      if lscpu 2>/dev/null | grep -Eiq '(^|[[:space:]])(Flags:).*(\batomics\b|\blse\b)'; then
        return 0
      fi
      return 1
      ;;
    *) return 1 ;;
  esac
}

scas_floci_prepare_data_dir() {
  local dir="${1:?}"
  mkdir -p "$dir"
  # Container user is uid 1001 (floci). Prefer chown; fall back to world-writable.
  if [ "$(id -u)" = "0" ]; then
    chown -R 1001:1001 "$dir" 2>/dev/null || chmod -R a+rwx "$dir"
  elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    sudo chown -R 1001:1001 "$dir" 2>/dev/null || chmod -R a+rwx "$dir"
  else
    chmod -R a+rwx "$dir" 2>/dev/null || true
  fi
}

# Export DOCKER_GID + FLOCI_RUN_AS_ROOT so compose can reach the host daemon
# (needed for /_floci/ui sidecar and Lambda/ECR/ECS). Writes keys into infrastructure/floci/.env.
scas_floci_ensure_docker_access() {
  local env_file="${1:?}"
  local sock="${DOCKER_HOST:-unix:///var/run/docker.sock}"
  local sock_path="/var/run/docker.sock"
  case "$sock" in
    unix://*) sock_path="${sock#unix://}" ;;
  esac

  local gid=0
  if [ -S "$sock_path" ]; then
    if gid="$(stat -c '%g' "$sock_path" 2>/dev/null)"; then
      :
    elif gid="$(stat -f '%g' "$sock_path" 2>/dev/null)"; then
      :
    else
      gid=0
    fi
  fi
  export DOCKER_GID="${DOCKER_GID:-$gid}"

  # Default: run as root so a root-only socket still works. Operators can set
  # FLOCI_RUN_AS_ROOT=false once group_add + docker group membership is enough.
  if [ -z "${FLOCI_RUN_AS_ROOT:-}" ]; then
    export FLOCI_RUN_AS_ROOT=true
  else
    export FLOCI_RUN_AS_ROOT
  fi

  touch "$env_file"
  if grep -q '^DOCKER_GID=' "$env_file" 2>/dev/null; then
    sed -i.bak "s/^DOCKER_GID=.*/DOCKER_GID=${DOCKER_GID}/" "$env_file" 2>/dev/null \
      || sed -i '' "s/^DOCKER_GID=.*/DOCKER_GID=${DOCKER_GID}/" "$env_file"
    rm -f "${env_file}.bak"
  else
    echo "DOCKER_GID=${DOCKER_GID}" >> "$env_file"
  fi
  if grep -q '^FLOCI_RUN_AS_ROOT=' "$env_file" 2>/dev/null; then
    sed -i.bak "s/^FLOCI_RUN_AS_ROOT=.*/FLOCI_RUN_AS_ROOT=${FLOCI_RUN_AS_ROOT}/" "$env_file" 2>/dev/null \
      || sed -i '' "s/^FLOCI_RUN_AS_ROOT=.*/FLOCI_RUN_AS_ROOT=${FLOCI_RUN_AS_ROOT}/" "$env_file"
    rm -f "${env_file}.bak"
  else
    echo "FLOCI_RUN_AS_ROOT=${FLOCI_RUN_AS_ROOT}" >> "$env_file"
  fi
}

# Probe /_floci/ui/status — returns 0 when ready or still starting without a hard error.
scas_floci_ui_status_ok() {
  local body
  body="$(curl -fsS --connect-timeout 2 --max-time 5 "${SCAS_FLOCI_ENDPOINT}/_floci/ui/status" 2>/dev/null)" || return 1
  python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("ready") or not d.get("error") else 1)' <<<"$body" 2>/dev/null
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
    echo "   One-time setup:  ./scripts/floci/floci-setup.sh" >&2
    echo "   Start emulator:  ./scripts/floci/floci-up.sh" >&2
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
    echo "   Try: ./scripts/floci/floci-down.sh && rm -rf infrastructure/floci/data/* && ./scripts/floci/floci-up.sh" >&2
    echo "   Logs: docker logs scas-floci --tail 80" >&2
    return 1
  fi

  if scas_floci_aws_on_host s3 cp "$abs" "s3://${bucket}/${key}"; then
    return 0
  fi
  echo "❌ Cannot upload $abs — start Floci (./scripts/floci/floci-up.sh) or install aws CLI." >&2
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

# --- Extended AWS helpers (SQS, EventBridge, STS, ECS, CloudWatch Logs) ---

scas_floci_sqs_create_queue() {
  local name="${1:?queue name}"
  scas_floci_aws sqs create-queue --queue-name "$name" --output text --query 'QueueUrl' 2>/dev/null || true
}

scas_floci_sqs_send() {
  local queue_url="${1:?queue url}"
  local body="${2:?message body}"
  scas_floci_aws sqs send-message --queue-url "$queue_url" --message-body "$body" >/dev/null 2>&1
}

scas_floci_sns_create_topic() {
  local name="${1:?topic name}"
  scas_floci_aws sns create-topic --name "$name" --output text --query 'TopicArn' 2>/dev/null || true
}

scas_floci_sns_publish() {
  local topic_arn="${1:?topic arn}"
  local message="${2:?message}"
  scas_floci_aws sns publish --topic-arn "$topic_arn" --message "$message" >/dev/null 2>&1
}

scas_floci_eventbridge_put() {
  local detail_type="${1:?detail type}"
  local detail="${2:?detail json}"
  local tmp entries
  tmp="$(mktemp)"
  python3 -c 'import json,sys; print(json.dumps([{"Source":"scas.lab","DetailType":sys.argv[1],"Detail":sys.argv[2]}]))' \
    "$detail_type" "$detail" >"$tmp"
  entries="$(cat "$tmp")"
  rm -f "$tmp"
  scas_floci_aws events put-events --entries "$entries" >/dev/null 2>&1 || true
}

scas_floci_sts_get_caller() {
  scas_floci_aws sts get-caller-identity
}

scas_floci_iam_create_role() {
  local name="${1:?role name}"
  local trust="${2:-{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"codebuild.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}}"
  scas_floci_aws iam create-role --role-name "$name" --assume-role-policy-document "$trust" >/dev/null 2>&1 || true
}

scas_floci_ecs_create_cluster() {
  local name="${1:?cluster name}"
  scas_floci_aws ecs create-cluster --cluster-name "$name" >/dev/null 2>&1 || true
}

scas_floci_ecs_register_task() {
  local family="${1:?task family}"
  local image="${2:?container image}"
  local tmp
  tmp="$(mktemp)"
  cat >"$tmp" <<EOF
{
  "family": "${family}",
  "networkMode": "bridge",
  "containerDefinitions": [{
    "name": "app",
    "image": "${image}",
    "essential": true,
    "memory": 128
  }]
}
EOF
  scas_floci_aws ecs register-task-definition --cli-input-json "file://${tmp}" >/dev/null 2>&1 || true
  rm -f "$tmp"
}

scas_floci_ecs_run_task() {
  local cluster="${1:?cluster}"
  local task_def="${2:?task definition family or arn}"
  scas_floci_aws ecs run-task --cluster "$cluster" --task-definition "$task_def" --launch-type EC2 >/dev/null 2>&1 || true
}

scas_floci_logs_put() {
  local log_group="${1:?log group}"
  local log_stream="${2:?log stream}"
  local message="${3:?message}"
  local ts
  ts="$(python3 -c 'import time; print(int(time.time()*1000))')"
  scas_floci_aws logs create-log-group --log-group-name "$log_group" >/dev/null 2>&1 || true
  scas_floci_aws logs create-log-stream --log-group-name "$log_group" --log-stream-name "$log_stream" >/dev/null 2>&1 || true
  scas_floci_aws logs put-log-events \
    --log-group-name "$log_group" \
    --log-stream-name "$log_stream" \
    --log-events "timestamp=${ts},message=${message}" >/dev/null 2>&1 || true
}

scas_floci_codepipeline_create() {
  local name="${1:?pipeline name}"
  local bucket="${2:?artifact bucket}"
  local role_arn="${3:-arn:aws:iam::000000000000:role/scas-codepipeline-role}"
  local tmp
  tmp="$(mktemp)"
  cat >"$tmp" <<EOF
{
  "pipeline": {
    "name": "${name}",
    "roleArn": "${role_arn}",
    "artifactStore": {"type": "S3", "location": "${bucket}"},
    "stages": [
      {"name": "Source", "actions": [{"name": "Source", "actionTypeId": {"category": "Source", "owner": "AWS", "provider": "S3", "version": "1"}, "configuration": {"S3Bucket": "${bucket}", "S3ObjectKey": "source.zip"}, "outputArtifacts": [{"name": "SourceOutput"}]}]},
      {"name": "Build", "actions": [{"name": "Build", "actionTypeId": {"category": "Build", "owner": "AWS", "provider": "CodeBuild", "version": "1"}, "configuration": {"ProjectName": "${name}-build"}, "inputArtifacts": [{"name": "SourceOutput"}], "outputArtifacts": [{"name": "BuildOutput"}]}]}
    ]
  }
}
EOF
  scas_floci_aws codepipeline create-pipeline --cli-input-json "file://${tmp}" >/dev/null 2>&1 || true
  rm -f "$tmp"
}

scas_floci_stepfunctions_create() {
  local name="${1:?state machine name}"
  local definition="${2:?state machine definition json}"
  local role_arn="${3:-arn:aws:iam::000000000000:role/scas-sfn-role}"
  scas_floci_aws stepfunctions create-state-machine \
    --name "$name" \
    --definition "$definition" \
    --role-arn "$role_arn" >/dev/null 2>&1 || true
}

scas_floci_ssm_put_parameter() {
  local name="${1:?parameter name}"
  local value="${2:?parameter value}"
  scas_floci_aws ssm put-parameter --name "$name" --value "$value" --type String --overwrite >/dev/null 2>&1 || true
}

# --- Lookalike lab secrets (never overwrite SCAS_FLOCI_AWS_* / emulator auth) ---

scas_floci_lookalike_root() {
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  printf '%s' "${here}/scenarios/_shared"
}

scas_floci_ensure_lookalike() {
  # shellcheck disable=SC1091
  source "$(scas_floci_lookalike_root)/ensure-lookalike-secrets.sh"
}

scas_floci_lookalike_get() {
  local key="${1:?}"
  local file
  scas_floci_ensure_lookalike
  file="$(scas_floci_lookalike_root)/lookalike-secrets.env"
  local line
  line="$(grep -E "^export ${key}=" "$file" | head -1 || true)"
  [ -n "$line" ] || { printf ''; return 0; }
  printf '%s' "${line#export ${key}=}"
}

scas_floci_lookalike_json() {
  # Print a JSON object from lookalike-secrets.json by top-level key (e.g. npm, aws_ci).
  local key="${1:?}"
  local file
  scas_floci_ensure_lookalike
  file="$(scas_floci_lookalike_root)/lookalike-secrets.json"
  python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(json.dumps(d[sys.argv[2]]))' "$file" "$key"
}

# Seed Secrets Manager / SSM with realistic lookalike values for harvest labs.
# Does not export AWS_* into this shell (emulator auth stays SCAS_FLOCI_*).
scas_floci_seed_lookalike_secrets() {
  local id="${1:?scenario id e.g. 05}"
  # normalize 5 → 05
  if [[ "$id" =~ ^[0-9]$ ]]; then
    id="0${id}"
  fi

  local npm_json aws_json github_token db_url
  npm_json="$(scas_floci_lookalike_json npm)"
  aws_json="$(scas_floci_lookalike_json aws_ci)"
  github_token="$(scas_floci_lookalike_get GITHUB_TOKEN)"
  db_url="$(scas_floci_lookalike_get DATABASE_URL)"

  case "$id" in
    05)
      scas_floci_ssm_put_parameter "/scas/sc05/ci-database-url" "$db_url"
      scas_floci_secret_put "scas/sc05/ci-aws" "$aws_json"
      scas_floci_secret_put "scas/sc05/ci-database" "$(scas_floci_lookalike_json database)"
      ;;
    06)
      scas_floci_secret_put "scas/sc06/decoy-npm-token" "$npm_json"
      scas_floci_secret_put "scas/sc06/decoy-github-pat" "$(scas_floci_lookalike_json github)"
      scas_floci_secret_put "scas/sc06/decoy-aws" "$aws_json"
      ;;
    21)
      scas_floci_secret_put "scas/sc21/ci-aws-role" "$aws_json"
      scas_floci_secret_put "scas/sc21/decoy-npm-token" "$npm_json"
      ;;
    23)
      scas_floci_ssm_put_parameter "/scas/sc23/github-pat" "$github_token"
      scas_floci_secret_put "scas/sc23/ci-aws" "$aws_json"
      scas_floci_secret_put "scas/sc23/ci-docker" "$(scas_floci_lookalike_json docker)"
      ;;
    *)
      echo "   (no Floci lookalike SM/SSM map for scenario ${id})" >&2
      return 0
      ;;
  esac

  local plant
  plant="$(scas_floci_lookalike_root)/plant-lookalike-secrets.sh"
  if [ -x "$plant" ] || [ -f "$plant" ]; then
    bash "$plant" "$id" || true
  fi
}
