#!/bin/bash
# Scenario 22: LiteLLM-style PyPI compromise (safe simulation)
set -e

echo "================================================"
echo "🔧 Scenario 22: LiteLLM-style PyPI compromise"
echo "================================================"
echo ""

if [ "${TESTBENCH_MODE:-}" != "enabled" ]; then
  echo "⚠️  TESTBENCH_MODE is not enabled"
  echo "   export TESTBENCH_MODE=enabled"
  echo ""
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo ""
  if [[ ! ${REPLY:-} =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

command -v python3 >/dev/null 2>&1 || { echo "❌ python3 required"; exit 1; }

cd victim-app
rm -rf .venv
python3 -m venv .venv
# shellcheck source=/dev/null
source .venv/bin/activate
python -m pip install -U pip setuptools wheel >/dev/null
python -m pip install ../python-packages/v1_82_6
deactivate
cd ..

chmod +x infrastructure/mock_server.py detection-tools/litellm_pth_scanner.py victim-app/run_victim.py 2>/dev/null || true

echo ""
echo "================================================"
echo "✅ Setup complete (clean litellm_like 1.82.6 in victim-app/.venv)"
echo "================================================"
echo ""
echo "1) Terminal A — mock server:"
echo "   python3 infrastructure/mock_server.py"
echo ""
echo "2) Import-time compromise (1.82.7):"
echo "   cd victim-app && source .venv/bin/activate"
echo "   pip install -U ../python-packages/v1_82_7"
echo "   export TESTBENCH_MODE=enabled && python run_victim.py"
echo ""
echo "3) .pth startup compromise (1.82.8) — install WITH testbench so .pth is dropped:"
echo "   cd victim-app && source .venv/bin/activate"
echo "   pip uninstall -y litellm_like 2>/dev/null || true"
echo "   export TESTBENCH_MODE=enabled && pip install ../python-packages/v1_82_8"
echo "   python -c \"print('any script triggers .pth')\""
echo ""
echo "4) Evidence:"
echo "   curl -s http://127.0.0.1:3022/captured-data"
echo "   python detection-tools/litellm_pth_scanner.py   # from repo root after: source victim-app/.venv/bin/activate"
echo ""
echo "Offline: TESTBENCH_OFFLINE=1 python ... (skips urllib beacon; see README)"
echo "Full lab: cat README.md"
echo ""
