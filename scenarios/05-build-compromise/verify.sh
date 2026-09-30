#!/usr/bin/env bash
# Auto-generated verify for 05-build-compromise
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.yml}"
C2_URL="${C2_URL:-http://127.0.0.1:3000}"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

echo "===> Clearing prior captures"
curl -sf -X DELETE "http://127.0.0.1:3000/captured-data" >/dev/null || true

echo "===> Triggering lab (bash ../run-ci.sh)"
docker compose -f "$COMPOSE_FILE" exec -T victim \
  bash -lc 'cd /lab/05-build-compromise/victim-app && TESTBENCH_MODE=enabled GITHUB_TOKEN=x AWS_ACCESS_KEY_ID=x AWS_SECRET_ACCESS_KEY=y DATABASE_PASSWORD=z bash ../run-ci.sh' || true

echo "===> Waiting for capture (grep: vendor/build-action)"
ok=0
for _ in $(seq 1 30); do
  DATA="$(curl -sf "$C2_URL/captured-data" 2>/dev/null || echo '{}')"
  if echo "$DATA" | grep -q 'vendor/build-action'; then
    ok=1
    break
  fi
  sleep 1
done

if [[ "$ok" -ne 1 ]]; then
  echo "Verification failed for 05-build-compromise" >&2
  echo "$DATA" || true
  exit 1
fi

echo "Verification successful: 05-build-compromise"
exit 0
