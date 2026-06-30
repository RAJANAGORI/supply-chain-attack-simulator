#!/usr/bin/env bash
# SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
# Build REAL local git repositories so the submodule attack executes authentically.
# Nothing touches the internet. Everything lives under work/ (gitignored).
#
#   work/malicious-lib    bare repo — the attacker-controlled submodule source
#   work/awesome-project  parent repo with .gitmodule pointing at malicious-lib
#
# The learner then runs:
#   git -c protocol.file.allow=always clone --recurse-submodules \
#       work/awesome-project work/victim-clone
#   TESTBENCH_MODE=enabled npm --prefix work/victim-clone install
#
# The npm install triggers the real postinstall hook inside the real submodule,
# demonstrating the authentic attack path: clone → recurse submodules → npm install
# → postinstall.sh fires → exfiltrates to localhost:3000.
set -euo pipefail

SCENARIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${SCENARIO_DIR}"

WORK="work"
rm -rf "${WORK}"
mkdir -p "${WORK}"

# Pass local git identity + enable file:// submodule transport.
# git ≥ 2.38 (CVE-2022-39253) blocks local submodule URLs unless explicitly
# allowed. We set this per-command so we never touch the global config.
GIT=(git
  -c user.email=labs@scas.local
  -c user.name="SCAS Lab"
  -c init.defaultBranch=main
  -c commit.gpgsign=false
  -c protocol.file.allow=always
)

# ── 1. Malicious submodule source repo ───────────────────────────────────────
MAL="${WORK}/malicious-lib"
mkdir -p "${MAL}"
cp malicious-submodule/postinstall.sh "${MAL}/postinstall.sh"
[ -f malicious-submodule/README.md ] && cp malicious-submodule/README.md "${MAL}/README.md"
chmod +x "${MAL}/postinstall.sh"
(
  cd "${MAL}"
  "${GIT[@]}" init -q
  "${GIT[@]}" add -A
  "${GIT[@]}" commit -qm "add helper utilities"
)

# ── 2. Parent project repo with the malicious submodule embedded ──────────────
PARENT="${WORK}/awesome-project"
mkdir -p "${PARENT}"

# Minimal package.json — the postinstall hook is all that matters for the attack.
# No external npm dependencies → npm install finishes offline.
cat > "${PARENT}/package.json" << 'PKGJSON'
{
  "name": "awesome-project",
  "version": "1.0.0",
  "description": "Compromised project — malicious submodule embedded",
  "main": "index.js",
  "scripts": {
    "postinstall": "bash libs/malicious-submodule/postinstall.sh"
  }
}
PKGJSON

printf 'console.log("[awesome-project] loaded");\n' > "${PARENT}/index.js"

(
  cd "${PARENT}"
  "${GIT[@]}" init -q
  "${GIT[@]}" add -A
  "${GIT[@]}" commit -qm "initial awesome-project commit"
  # Attacker pushes a commit that registers the malicious submodule
  "${GIT[@]}" submodule add -q \
    -b main \
    "$(pwd)/../malicious-lib" \
    libs/malicious-submodule
  "${GIT[@]}" commit -qm "feat: add helper utilities via submodule"
)

SCENARIO_ABS="$(pwd)"
echo ""
echo "[build-repos] Real git repos built:"
echo "  Parent repo:   ${SCENARIO_ABS}/${PARENT}"
echo "  Submodule src: ${SCENARIO_ABS}/${WORK}/malicious-lib"
echo ""
echo "[build-repos] Next — clone the compromised repo (simulates victim 'git clone'):"
echo "  git -c protocol.file.allow=always clone --recurse-submodules \\"
echo "      ${SCENARIO_ABS}/${PARENT} ${SCENARIO_ABS}/${WORK}/victim-clone"
echo ""
echo "[build-repos] Then trigger the attack (npm postinstall calls the submodule script):"
echo "  export TESTBENCH_MODE=enabled"
echo "  npm --prefix ${SCENARIO_ABS}/${WORK}/victim-clone install"
