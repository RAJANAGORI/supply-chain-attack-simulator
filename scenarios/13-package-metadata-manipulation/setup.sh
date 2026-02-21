#!/usr/bin/env bash
set -euo pipefail

# Minimal setup: create node_modules placeholders used in labs
mkdir -p legitimate-packages/clean-utils
mkdir -p compromised-packages/clean-utils
mkdir -p victim-app
mkdir -p infrastructure
mkdir -p detection-tools
echo "Setup complete for scenario 13. Edit packages as needed."

