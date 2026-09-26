#!/usr/bin/env bash
# Auto-generated verify for 06-sha-hulud
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.yml}"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

echo "===> Clearing prior evidence"
curl -sf -X DELETE "http://127.0.0.1:3001/captured-credentials" >/dev/null || true
curl -sf -X DELETE "http://127.0.0.1:3003/published-packages" >/dev/null || true
curl -sf -X DELETE "http://127.0.0.1:3002/backdoor-prs" >/dev/null || true

echo "===> Triggering lab (npm install)"
docker compose -f "$COMPOSE_FILE" exec -T victim \
  bash -lc 'cd /lab/06-sha-hulud/victim-app && npm install' || true

echo "===> Waiting for token harvest evidence"
ok=0
for _ in $(seq 1 30); do
  DATA="$(curl -sf "http://127.0.0.1:3001/captured-credentials" 2>/dev/null || echo '{}')"
  if echo "$DATA" | grep -q '_authToken'; then
    ok=1
    break
  fi
  sleep 1
done

if [[ "$ok" -ne 1 ]]; then
  echo "Verification failed for 06-sha-hulud" >&2
  echo "$DATA" || true
  exit 1
fi

echo "===> Checking worm replication evidence"
PUBLISH_DATA="$(curl -sf "http://127.0.0.1:3003/published-packages" 2>/dev/null || echo '{}')"
PR_DATA="$(curl -sf "http://127.0.0.1:3002/backdoor-prs" 2>/dev/null || echo '{}')"

if ! echo "$PUBLISH_DATA" | grep -q 'malicious_publish'; then
  echo "Warning: no malicious publish evidence recorded" >&2
fi

if ! echo "$PR_DATA" | grep -q 'backdoor_pr'; then
  echo "Warning: no backdoor PR evidence recorded" >&2
fi

echo "Verification successful: 06-sha-hulud"
exit 0
