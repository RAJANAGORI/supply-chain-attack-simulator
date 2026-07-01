#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori — Supply Chain Attack Simulator
# Scenario 23: Trivy Supply Chain Attack
#
# Simulates what would happen when a CI runner downloads and installs
# the compromised trivy-action@v0.69.4 (force-pushed tag v0.34.2).
#
# EDUCATIONAL — localhost only, TESTBENCH_MODE gate required.

if [ "${TESTBENCH_MODE}" != "enabled" ]; then
    echo "[SAFE] TESTBENCH_MODE not enabled — malicious behavior prevented."
    exit 0
fi

echo "[TESTBENCH] Simulating trivy-action v0.69.4 installation..."
echo "[TESTBENCH] In the real attack:"
echo "  - Attackers force-pushed tag aquasecurity/trivy-action@v0.34.2"
echo "  - Any CI run pinned to that tag re-downloaded malicious code"
echo "  - Existing pipelines were compromised without any PR or review"
echo ""
echo "[TESTBENCH] The malicious Node.js payload is in trivy-action-like.js"
echo "[TESTBENCH] Run the victim CI pipeline to see it execute:"
echo "  cd ../../victim-ci && export TESTBENCH_MODE=enabled && node run-pipeline.js"
