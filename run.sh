#!/usr/bin/env bash
# Thin alias: full SCAS stack (ES + Floci + act check + dashboard).
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/scripts/ui/run-everything.sh" "$@"
