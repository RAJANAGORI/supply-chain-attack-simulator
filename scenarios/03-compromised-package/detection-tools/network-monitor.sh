#!/bin/bash
# Educational helper: reminds learners to observe exfiltration via the mock server.
# For real traffic capture, use your OS tools (tcpdump, Wireshark) on loopback.

echo "Scenario 3: Compromised package traffic goes to the mock server on localhost:3000."
echo "With the server running, poll captured payloads:"
echo "  curl -s http://localhost:3000/captured-data | jq ."
echo ""
