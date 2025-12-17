#!/bin/bash

# Network Monitor for Testbench
# Monitors network connections during package execution

echo "🌐 Network Monitor - Supply Chain Attack Testbench"
echo "=================================================="
echo ""
echo "This script monitors outbound network connections"
echo "from Node.js processes to detect data exfiltration."
echo ""

# Check if running on macOS or Linux
OS="$(uname -s)"

if [ "$OS" = "Darwin" ]; then
    # macOS
    echo "Detected macOS - using lsof for monitoring"
    echo ""
    echo "Monitoring Node.js network connections..."
    echo "Press Ctrl+C to stop"
    echo ""
    
    while true; do
        lsof -i -n -P | grep node | grep -E "TCP|UDP" | grep -v LISTEN
        sleep 2
    done
    
elif [ "$OS" = "Linux" ]; then
    # Linux
    echo "Detected Linux - using netstat/ss for monitoring"
    echo ""
    echo "Monitoring Node.js network connections..."
    echo "Press Ctrl+C to stop"
    echo ""
    
    if command -v ss &> /dev/null; then
        while true; do
            ss -tunp | grep node
            sleep 2
        done
    else
        while true; do
            netstat -tunp 2>/dev/null | grep node
            sleep 2
        done
    fi
else
    echo "Unsupported OS: $OS"
    echo "Please use macOS or Linux for network monitoring"
    exit 1
fi

