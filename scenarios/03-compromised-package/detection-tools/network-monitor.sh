#!/bin/bash
# Delegates to the shared network monitor at repo root.
exec "$(cd "$(dirname "$0")/../../.." && pwd)/detection-tools/network-monitor.sh" "$@"
