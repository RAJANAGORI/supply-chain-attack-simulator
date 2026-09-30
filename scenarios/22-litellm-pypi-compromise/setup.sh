#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
# Scenario 22: LiteLLM-style PyPI compromise (safe simulation)
SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCENARIO_DIR}"
# shellcheck disable=SC1091
source "${SCENARIO_DIR}/../_shared/enable-testbench.sh"

set -euo pipefail

echo "================================================"
echo "🔧 Scenario 22: LiteLLM-style PyPI compromise"
echo "================================================"
echo ""

cd "${SCENARIO_DIR}"
mkdir -p infrastructure victim-app
echo '{"events": []}' > infrastructure/captured-data.json
rm -f victim-app/.testbench-litellm-*.json

command -v python3 >/dev/null 2>&1 || { echo "❌ python3 required"; exit 1; }

# Debian/Ubuntu often ship python3 without ensurepip (need python3-venv).
# Prefer: venv → venv --without-pip + get-pip → virtualenv → uv.
create_venv() {
  local dest="$1"
  rm -rf "${dest}"

  local err
  err="$(mktemp)"
  if python3 -m venv "${dest}" 2>"${err}"; then
    rm -f "${err}"
    return 0
  fi

  echo "⚠️  python3 -m venv failed (often missing python3-venv / ensurepip)."
  echo "   Trying --without-pip + bootstrap pip..."

  if python3 -m venv --without-pip "${dest}" 2>>"${err}"; then
    local getpip
    getpip="$(mktemp)"
    if python3 - "${getpip}" <<'PY'
import sys
import urllib.request

urllib.request.urlretrieve("https://bootstrap.pypa.io/get-pip.py", sys.argv[1])
print("downloaded get-pip.py")
PY
    then
      "${dest}/bin/python" "${getpip}" --disable-pip-version-check
      rm -f "${getpip}" "${err}"
      return 0
    fi
    rm -f "${getpip}"
  fi
  rm -rf "${dest}"

  if command -v virtualenv >/dev/null 2>&1; then
    echo "   Falling back to virtualenv..."
    virtualenv -p python3 "${dest}"
    return 0
  fi

  if command -v uv >/dev/null 2>&1; then
    echo "   Falling back to uv venv..."
    uv venv "${dest}"
    return 0
  fi

  echo ""
  echo "❌ Could not create a virtualenv."
  echo "   On Debian/Ubuntu install the matching venv package, for example:"
  echo "     sudo apt install python3-venv python3-pip"
  echo "   or for a specific version (see the error below):"
  echo "     sudo apt install python3.12-venv   # or python3.14-venv, etc."
  echo ""
  echo "--- venv error ---"
  cat "${err}" || true
  rm -f "${err}"
  exit 1
}

cd victim-app
create_venv .venv
# shellcheck source=/dev/null
source .venv/bin/activate
python -m pip install -U pip setuptools wheel
python -m pip install ../python-packages/v1_82_6
deactivate
cd ..

chmod +x infrastructure/mock_server.py detection-tools/litellm_pth_scanner.py victim-app/run_victim.py 2>/dev/null || true

echo ""
echo "================================================"
echo "✅ Setup complete (clean litellm_like 1.82.6 in victim-app/.venv)"
echo "================================================"
echo ""
echo "1) Terminal A — mock server (system python is enough):"
echo "   python3 infrastructure/mock_server.py"
echo ""
echo "2) Import-time compromise (1.82.7):"
echo "   cd victim-app && source .venv/bin/activate"
echo "   pip install -U ../python-packages/v1_82_7"
echo "   export TESTBENCH_MODE=enabled && python run_victim.py"
echo ""
echo "3) Evidence:"
echo "   curl -s http://127.0.0.1:3022/captured-data"
echo ""
