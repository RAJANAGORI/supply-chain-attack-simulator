#!/usr/bin/env bash
# Embed SCAS authorship fingerprints across scenario trees (idempotent).
# Run after cloning or when adding new scenarios.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FP="SCAS-FP-RN-8d4f2c9a1e7b3065"
FP_COMMENT=" * ${FP} © Raja Nagori — Supply Chain Attack Simulator"
FP_SHELL="# ${FP} © Raja Nagori"
FP_JS="/** ${FP} © Raja Nagori */"
FP_PY="# ${FP} © Raja Nagori"
PROVENANCE_REQUIRE="require('../../_shared/scenario-provenance');"

contains_fp() {
  grep -q "${FP}" "$1" 2>/dev/null
}

embed_js_block_comment() {
  local file="$1"
  contains_fp "$file" && return 0
  if head -n1 "$file" | grep -q '^/\*\*'; then
    sed -i '' "1a\\
${FP_COMMENT}
" "$file"
  elif head -n1 "$file" | grep -q '^#!'; then
    sed -i '' "1a\\
${FP_JS}
" "$file"
  else
    printf '%s\n\n' "$FP_JS" | cat - "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
  fi
}

embed_shell_comment() {
  local file="$1"
  contains_fp "$file" && return 0
  if head -n1 "$file" | grep -q '^#!'; then
    sed -i '' "1a\\
${FP_SHELL}
" "$file"
  else
    printf '%s\n\n' "$FP_SHELL" | cat - "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
  fi
}

embed_python_comment() {
  local file="$1"
  contains_fp "$file" && return 0
  if head -n1 "$file" | grep -q '^#!'; then
    sed -i '' "1a\\
${FP_PY}
" "$file"
  else
    printf '%s\n\n' "$FP_PY" | cat - "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
  fi
}

embed_mock_server_require() {
  local file="$1"
  grep -q "_shared/scenario-provenance" "$file" 2>/dev/null && return 0
  if grep -q "^const http = require('http');" "$file"; then
    sed -i '' "/^const http = require('http');/i\\
${PROVENANCE_REQUIRE}
" "$file"
  elif grep -q '^const http = require("http");' "$file"; then
    sed -i '' "/^const http = require(\"http\");/i\\
${PROVENANCE_REQUIRE}
" "$file"
  fi
}

echo "Embedding ${FP} under ${ROOT}/scenarios ..."

while IFS= read -r file; do
  embed_js_block_comment "$file"
  embed_mock_server_require "$file"
done < <(find "${ROOT}/scenarios" -path '*/infrastructure/mock-server.js' -type f | sort)

while IFS= read -r file; do
  embed_js_block_comment "$file"
done < <(find "${ROOT}/scenarios/06-sha-hulud/infrastructure" -name '*.js' -type f | sort)

while IFS= read -r file; do
  embed_shell_comment "$file"
done < <(find "${ROOT}/scenarios" -maxdepth 2 -name 'setup.sh' -type f | sort)

while IFS= read -r file; do
  embed_js_block_comment "$file"
done < <(find "${ROOT}/scenarios" -path '*/templates/*.js' -type f | sort)

if [[ -f "${ROOT}/scenarios/22-litellm-pypi-compromise/infrastructure/mock_server.py" ]]; then
  embed_python_comment "${ROOT}/scenarios/22-litellm-pypi-compromise/infrastructure/mock_server.py"
fi

if [[ -f "${ROOT}/detection-tools/package-scanner.js" ]]; then
  embed_js_block_comment "${ROOT}/detection-tools/package-scanner.js"
fi

echo "Done. Run ./scripts/verify-provenance.sh to audit."
