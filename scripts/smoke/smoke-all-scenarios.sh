#!/usr/bin/env bash
# Run lightweight end-to-end checks for each scenario (TESTBENCH_MODE safety on).
# Requires: node, npm, python3, curl. Run from repo root: ./scripts/smoke/smoke-all-scenarios.sh
set +m
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORTS_FILE="${ROOT}/scripts/setup/ports.env"
export TESTBENCH_MODE=enabled

kill_on() {
  local p="$1"
  local pids
  # LISTEN only — avoid killing control-plane clients connected to mock ports
  pids="$(lsof -nP -iTCP:"${p}" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    # shellcheck disable=SC2086
    kill -9 ${pids} 2>/dev/null || true
  fi
}

free_common_ports() {
  # shellcheck source=/dev/null
  source "${PORTS_FILE}"
  for p in "${TESTBENCH_PORTS[@]}"; do
    kill_on "$p"
  done
}

# Returns 0 if JSON has non-empty captures | beacons | events | top-level array
has_capture_payload() {
  node -e '
    const fs = require("fs");
    let s = "";
    try { s = fs.readFileSync(0, "utf8"); } catch { process.exit(1); }
    let j; try { j = JSON.parse(s); } catch { process.exit(1); }
    const arr = Array.isArray(j) ? j : (j.captures || j.beacons || j.events || []);
    process.exit(Array.isArray(arr) && arr.length > 0 ? 0 : 1);
  ' <<<"$1"
}

pass=0
fail=0
note() { echo ""; echo ">>> $*"; }

ok() { echo "PASS: $*"; pass=$((pass + 1)); }
bad() { echo "FAIL: $*"; fail=$((fail + 1)); }

cd "$ROOT"

# Optional: SMOKE_ONLY="05 06 18 20 24 25" ./scripts/smoke/smoke-all-scenarios.sh
smoke_wanted() {
  local id="$1"
  [[ -z "${SMOKE_ONLY:-}" ]] && return 0
  [[ " ${SMOKE_ONLY} " == *" ${id} "* ]]
}

# --- 01 ---
if smoke_wanted 01; then
note "Scenario 01 typosquatting"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/01-typosquatting
  node infrastructure/mock-server.js >/tmp/tb01-mock.log 2>&1 &
  echo $! >/tmp/tb01-mock.pid
  sleep 1
  cd victim-app
  npm install ../malicious-packages/request-lib >/tmp/tb01-npm.log 2>&1
  TESTBENCH_MODE=enabled node index.js >/tmp/tb01-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "01"; else bad "01 (no captures)"; fi
  kill "$(cat /tmp/tb01-mock.pid)" 2>/dev/null || true
}
fi

# --- 02 ---
if smoke_wanted 02; then
note "Scenario 02 dependency confusion (real registry race — attacker tarball via localhost:4874)"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/02-dependency-confusion
  # Build attacker tarball + fake public registry metadata
  cp templates/dependency-confusion-template.js attacker-packages/@techcorp/auth-lib/index.js
  node infrastructure/build-registry.js >/tmp/tb02-build.log 2>&1
  # Start mock C2 server
  node infrastructure/mock-server.js >/tmp/tb02-mock.log 2>&1 &
  echo $! >/tmp/tb02-mock.pid
  # Start fake public registry (attacker-controlled, serves v999.999.999)
  node infrastructure/registry-server.js >/tmp/tb02-reg.log 2>&1 &
  echo $! >/tmp/tb02-reg.pid
  sleep 1
  cd corporate-app
  rm -rf node_modules package-lock.json
  npm cache clean --force >/dev/null 2>&1 || true
  # .npmrc sets @techcorp:registry=localhost:4874 → npm downloads the malicious tarball
  TESTBENCH_MODE=enabled npm install >/tmp/tb02-npm.log 2>&1 || true
  sleep 1
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "02"; else bad "02 (no captures — check /tmp/tb02-*.log)"; fi
  kill "$(cat /tmp/tb02-mock.pid)" 2>/dev/null || true
  kill "$(cat /tmp/tb02-reg.pid)"  2>/dev/null || true
}
fi

# --- 03 ---
if smoke_wanted 03; then
note "Scenario 03 compromised package"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/03-compromised-package
  node infrastructure/mock-server.js >/tmp/tb03-mock.log 2>&1 &
  echo $! >/tmp/tb03-mock.pid
  sleep 1
  cd victim-app
  npm install ../compromised-package/secure-validator >/tmp/tb03-npm.log 2>&1
  TESTBENCH_MODE=enabled node index.js >/tmp/tb03-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "03"; else bad "03"; fi
  kill "$(cat /tmp/tb03-mock.pid)" 2>/dev/null || true
}
fi

# --- 04 ---
if smoke_wanted 04; then
note "Scenario 04 malicious update"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/04-malicious-update
  node infrastructure/mock-server.js >/tmp/tb04-mock.log 2>&1 &
  echo $! >/tmp/tb04-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules package-lock.json
  npm install ../malicious-update/utils-helper >/tmp/tb04-npm.log 2>&1
  TESTBENCH_MODE=enabled node index.js >/tmp/tb04-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "04"; else bad "04"; fi
  kill "$(cat /tmp/tb04-mock.pid)" 2>/dev/null || true
}
fi

# --- 05 ---
if smoke_wanted 05; then
note "Scenario 05 GitHub Actions workflow injection"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/05-build-compromise
  echo '{"captures":[]}' > infrastructure/captured-data.json
  if [[ -f ../_shared/plant-lookalike-secrets.sh ]]; then
    bash ../_shared/plant-lookalike-secrets.sh 05 >/tmp/tb05-secrets.log 2>&1 || true
  fi
  node infrastructure/mock-server.js >/tmp/tb05-mock.log 2>&1 &
  echo $! >/tmp/tb05-mock.pid
  sleep 1
  TESTBENCH_MODE=enabled ./run-ci.sh >/tmp/tb05-ci.log 2>&1 || true
  sleep 2
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "05"; else bad "05"; fi
  kill "$(cat /tmp/tb05-mock.pid)" 2>/dev/null || true
}
fi

# --- 06 ---
if smoke_wanted 06; then
note "Scenario 06 token-theft / re-publishing worm"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/06-sha-hulud
  echo '{"captures":[]}' > infrastructure/captured-credentials.json
  if [[ -f ../_shared/plant-lookalike-secrets.sh ]]; then
    bash ../_shared/plant-lookalike-secrets.sh 06 >/tmp/tb06-secrets.log 2>&1 || true
  fi
  cd infrastructure
  node credential-harvester.js >/tmp/tb06-harv.log 2>&1 &
  echo $! >/tmp/tb06-harv.pid
  node github-actions-simulator.js >/tmp/tb06-github.log 2>&1 &
  echo $! >/tmp/tb06-github.pid
  node mock-registry.js >/tmp/tb06-reg.log 2>&1 &
  echo $! >/tmp/tb06-reg.pid
  sleep 1
  cd ../victim-app
  rm -rf node_modules package-lock.json
  TESTBENCH_MODE=enabled npm install >/tmp/tb06-npm.log 2>&1
  sleep 2
  C="$(curl -s http://127.0.0.1:3001/captured-credentials)"
  if has_capture_payload "$C" && echo "$C" | grep -q 'token_harvest'; then ok "06"; else bad "06"; fi
  kill "$(cat /tmp/tb06-harv.pid)" "$(cat /tmp/tb06-github.pid)" "$(cat /tmp/tb06-reg.pid)" 2>/dev/null || true
}
fi

# --- 07 ---
if smoke_wanted 07; then
note "Scenario 07 transitive dependency"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/07-transitive-dependency
  node infrastructure/mock-server.js >/tmp/tb07-mock.log 2>&1 &
  echo $! >/tmp/tb07-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules package-lock.json
  npm install >/tmp/tb07-npm1.log 2>&1
  rm -rf node_modules/data-processor
  cp -r ../compromised-packages/data-processor node_modules/data-processor
  (cd node_modules/data-processor && TESTBENCH_MODE=enabled node postinstall.js) >/tmp/tb07-post.log 2>&1 || true
  TESTBENCH_MODE=enabled node index.js >/tmp/tb07-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "07"; else bad "07"; fi
  kill "$(cat /tmp/tb07-mock.pid)" 2>/dev/null || true
}
fi

# --- 08 ---
if smoke_wanted 08; then
note "Scenario 08 lock file manipulation"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/08-package-lock-file-manipulation
  node infrastructure/mock-server.js >/tmp/tb08-mock.log 2>&1 &
  echo $! >/tmp/tb08-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules
  TESTBENCH_MODE=enabled npm install >/tmp/tb08-npm.log 2>&1
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "08"; else bad "08"; fi
  kill "$(cat /tmp/tb08-mock.pid)" 2>/dev/null || true
}
fi

# --- 09 ---
if smoke_wanted 09; then
note "Scenario 09 signing bypass"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/09-package-signing-bypass
  node infrastructure/mock-server.js >/tmp/tb09-mock.log 2>&1 &
  echo $! >/tmp/tb09-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules package-lock.json
  npm install >/tmp/tb09-npm.log 2>&1
  TESTBENCH_MODE=enabled node index.js >/tmp/tb09-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "09"; else bad "09"; fi
  kill "$(cat /tmp/tb09-mock.pid)" 2>/dev/null || true
}
fi

# --- 10 ---
if smoke_wanted 10; then
note "Scenario 10 git submodule (real git clone --recurse-submodules + npm install)"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/10-git-submodule-attack
  node infrastructure/mock-server.js >/tmp/tb10-mock.log 2>&1 &
  echo $! >/tmp/tb10-mock.pid
  sleep 1
  # Build real local git repos (idempotent — wipes work/ each run)
  bash infrastructure/build-repos.sh >/tmp/tb10-build.log 2>&1
  # Real git clone --recurse-submodules fetches the malicious submodule
  git -c protocol.file.allow=always clone --recurse-submodules \
      work/awesome-project work/victim-clone >/tmp/tb10-git.log 2>&1
  # npm install triggers the real postinstall hook from the real submodule
  TESTBENCH_MODE=enabled npm --prefix work/victim-clone install \
      >/tmp/tb10-npm.log 2>&1 || true
  sleep 1
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "10"; else bad "10 (no captures — check /tmp/tb10-*.log)"; fi
  kill "$(cat /tmp/tb10-mock.pid)" 2>/dev/null || true
  rm -rf work/victim-clone
}
fi

# --- 11 ---
if smoke_wanted 11; then
note "Scenario 11 registry mirror poisoning (real npm registry server on localhost:4873)"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/11-registry-mirror-poisoning
  # Pack compromised packages + generate registry metadata
  node infrastructure/build-registry.js >/tmp/tb11-build.log 2>&1
  # Start mock C2 server
  node infrastructure/mock-server.js >/tmp/tb11-mock.log 2>&1 &
  echo $! >/tmp/tb11-mock.pid
  # Start the poisoned registry mirror (speaks npm registry protocol)
  node infrastructure/registry-server.js >/tmp/tb11-reg.log 2>&1 &
  echo $! >/tmp/tb11-reg.pid
  sleep 1
  cd corporate-app
  rm -rf node_modules package-lock.json
  # .npmrc points registry to localhost:4873 → npm downloads poisoned tarballs
  TESTBENCH_MODE=enabled npm install >/tmp/tb11-npm.log 2>&1 || true
  sleep 1
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "11"; else bad "11 (no captures — check /tmp/tb11-*.log)"; fi
  kill "$(cat /tmp/tb11-mock.pid)" 2>/dev/null || true
  kill "$(cat /tmp/tb11-reg.pid)"  2>/dev/null || true
}
fi

# --- 12 ---
if smoke_wanted 12; then
note "Scenario 12 workspace monorepo"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/12-workspace-monorepo-attack
  echo '{"captures": []}' > infrastructure/captured-data.json
  node infrastructure/mock-server.js >/tmp/tb12-mock.log 2>&1 &
  echo $! >/tmp/tb12-mock.pid
  sleep 1
  rm -rf packages node_modules package-lock.json
  mkdir -p packages
  cp -r legitimate-packages/* packages/
  npm install >/tmp/tb12-npm1.log 2>&1
  rm -rf packages/utils
  cp -r compromised-package/utils packages/utils
  rm -rf node_modules package-lock.json
  TESTBENCH_MODE=enabled npm install >/tmp/tb12-npm2.log 2>&1
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "12"; else bad "12"; fi
  kill "$(cat /tmp/tb12-mock.pid)" 2>/dev/null || true
}
fi

# --- 13 ---
if smoke_wanted 13; then
note "Scenario 13 package metadata manipulation"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/13-package-metadata-manipulation
  node infrastructure/mock-server.js >/tmp/tb13-mock.log 2>&1 &
  echo $! >/tmp/tb13-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules package-lock.json
  TESTBENCH_MODE=enabled npm install ../compromised-packages/clean-utils >/tmp/tb13-npm.log 2>&1
  TESTBENCH_MODE=enabled node index.js >/tmp/tb13-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3001/captured-data)"
  if has_capture_payload "$C"; then ok "13"; else bad "13"; fi
  kill "$(cat /tmp/tb13-mock.pid)" 2>/dev/null || true
}
fi

# --- 14 ---
if smoke_wanted 14; then
note "Scenario 14 container image (static scanner)"
{
  cd "$ROOT"
  cd scenarios/14-container-image-supply-chain-attack
  set +e
  node detection-tools/image-scanner.js images/compromised-image >/tmp/tb14-scan.log 2>&1
  st=$?
  set -e
  if [[ "$st" -eq 2 ]]; then ok "14"; else bad "14 (scanner exit $st)"; fi
}
fi

# --- 15 ---
if smoke_wanted 15; then
note "Scenario 15 developer tool compromise"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/15-developer-tool-compromise
  node infrastructure/mock-server.js >/tmp/tb15-mock.log 2>&1 &
  echo $! >/tmp/tb15-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules package-lock.json
  TESTBENCH_MODE=enabled npm install ../dev-tools/malicious-dev-tool >/tmp/tb15-npm.log 2>&1
  TESTBENCH_MODE=enabled node index.js >/tmp/tb15-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3015/captured-data)"
  if has_capture_payload "$C"; then ok "15"; else bad "15"; fi
  kill "$(cat /tmp/tb15-mock.pid)" 2>/dev/null || true
}
fi

# --- 16 ---
if smoke_wanted 16; then
note "Scenario 16 package cache poisoning"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/16-package-cache-poisoning
  node infrastructure/mock-server.js >/tmp/tb16-mock.log 2>&1 &
  echo $! >/tmp/tb16-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules package-lock.json
  TESTBENCH_MODE=enabled npm install >/tmp/tb16-npm.log 2>&1
  TESTBENCH_MODE=enabled node index.js >/tmp/tb16-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3016/captured-data)"
  if has_capture_payload "$C"; then ok "16"; else bad "16"; fi
  kill "$(cat /tmp/tb16-mock.pid)" 2>/dev/null || true
}
fi

# --- 17 ---
if smoke_wanted 17; then
note "Scenario 17 multi-stage attack chain"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/17-multi-stage-attack-chain
  echo '{"captures": []}' > infrastructure/captured-data.json
  node infrastructure/mock-server.js >/tmp/tb17-mock.log 2>&1 &
  echo $! >/tmp/tb17-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules package-lock.json
  npm install ../packages/stage1-access-lib ../packages/stage2-compromised-lib >/tmp/tb17-npm.log 2>&1
  TESTBENCH_MODE=enabled node index.js >/tmp/tb17-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3017/captured-data)"
  if has_capture_payload "$C"; then ok "17"; else bad "17"; fi
  kill "$(cat /tmp/tb17-mock.pid)" 2>/dev/null || true
}
fi

# --- 18 ---
if smoke_wanted 18; then
note "Scenario 18 pnpm .pnpmfile.cjs hook abuse"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/18-package-manager-plugin-attack
  echo '{"captures":[]}' > infrastructure/captured-data.json
  node infrastructure/mock-server.js >/tmp/tb18-mock.log 2>&1 &
  echo $! >/tmp/tb18-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules pnpm-lock.yaml
  TESTBENCH_MODE=enabled npx --yes pnpm@9.15.9 install >/tmp/tb18-pnpm.log 2>&1
  TESTBENCH_MODE=enabled node -r ../../_shared/testbench-env.js index.js >/tmp/tb18-app.log 2>&1 || true
  sleep 2
  C="$(curl -s http://127.0.0.1:3018/captured-data)"
  if has_capture_payload "$C"; then ok "18"; else bad "18"; fi
  kill "$(cat /tmp/tb18-mock.pid)" 2>/dev/null || true
}
fi

# --- 19 ---
if smoke_wanted 19; then
note "Scenario 19 SBOM manipulation"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/19-sbom-manipulation-attack
  node infrastructure/mock-server.js >/tmp/tb19-mock.log 2>&1 &
  echo $! >/tmp/tb19-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules package-lock.json
  npm install >/tmp/tb19-npm.log 2>&1
  TESTBENCH_MODE=enabled npm start >/tmp/tb19-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3019/captured-data)"
  if has_capture_payload "$C"; then ok "19"; else bad "19"; fi
  kill "$(cat /tmp/tb19-mock.pid)" 2>/dev/null || true
}
fi

# --- 20 ---
if smoke_wanted 20; then
note "Scenario 20 npm provenance / attestation abuse"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/20-package-version-confusion
  echo '{"captures":[]}' > infrastructure/captured-data.json
  node infrastructure/build-provenance.js >/tmp/tb20-prov.log 2>&1
  node infrastructure/mock-server.js >/tmp/tb20-mock.log 2>&1 &
  echo $! >/tmp/tb20-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules package-lock.json
  npm install >/tmp/tb20-npm.log 2>&1
  TESTBENCH_MODE=enabled npm start >/tmp/tb20-app.log 2>&1 || true
  sleep 2
  C="$(curl -s http://127.0.0.1:3020/captured-data)"
  if has_capture_payload "$C"; then ok "20"; else bad "20"; fi
  kill "$(cat /tmp/tb20-mock.pid)" 2>/dev/null || true
}
fi

# --- 21 ---
if smoke_wanted 21; then
note "Scenario 21 axios-style release"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/21-axios-compromised-release-attack
  node infrastructure/mock-server.js >/tmp/tb21-mock.log 2>&1 &
  echo $! >/tmp/tb21-mock.pid
  sleep 1
  # Tarball is not in git (*.tgz in .gitignore); build it like scenarios/21-.../setup.sh
  (
    cd packages/axios-like-1.14.1
    rm -rf node_modules
    rm -f ../axios-like-*.tgz
    npm install --ignore-scripts >/tmp/tb21-pack-npm.log 2>&1
    npm pack . >/tmp/tb21-pack.log 2>&1
    mv -f axios-like-*.tgz ..
  )
  cd victim-app
  rm -rf node_modules package-lock.json
  TESTBENCH_MODE=enabled npm install axios-like@file:../packages/axios-like-1.14.1.tgz >/tmp/tb21-npm.log 2>&1
  TESTBENCH_MODE=enabled npm start >/tmp/tb21-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3021/captured-data)"
  if has_capture_payload "$C"; then ok "21"; else bad "21"; fi
  kill "$(cat /tmp/tb21-mock.pid)" 2>/dev/null || true
}
fi

# --- 22 ---
if smoke_wanted 22; then
note "Scenario 22 litellm PyPI style"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/22-litellm-pypi-compromise
  python3 infrastructure/mock_server.py >/tmp/tb22-mock.log 2>&1 &
  echo $! >/tmp/tb22-mock.pid
  sleep 1
  cd victim-app
  # setup.sh creates .venv; smoke must recreate it when setup was not run
  rm -rf .venv
  python3 -m venv .venv
  # shellcheck source=/dev/null
  source .venv/bin/activate
  python -m pip install -U -q pip setuptools wheel >/tmp/tb22-pip-tools.log 2>&1
  pip install -U -q ../python-packages/v1_82_7 >/tmp/tb22-pip.log 2>&1
  TESTBENCH_MODE=enabled python run_victim.py >/tmp/tb22-run.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3022/captured-data)"
  if has_capture_payload "$C"; then ok "22"; else bad "22"; fi
  kill "$(cat /tmp/tb22-mock.pid)" 2>/dev/null || true
}
fi

# --- 23 ---
if smoke_wanted 23; then
note "Scenario 23 Trivy supply chain attack"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/23-trivy-supply-chain-attack
  echo '{"captures":[]}' > infrastructure/captured-data.json
  node infrastructure/mock-c2-server.js >/tmp/tb23-mock.log 2>&1 &
  echo $! >/tmp/tb23-mock.pid
  sleep 1
  # Plant lookalike CI secrets (same as setup.sh)
  if [[ -f ../_shared/plant-lookalike-secrets.sh ]]; then
    bash ../_shared/plant-lookalike-secrets.sh 23 >/tmp/tb23-secrets.log 2>&1 || true
  fi
  # setup.sh installs victim-ci deps; smoke must recreate node_modules when setup was not run
  cd victim-ci
  rm -rf node_modules package-lock.json
  npm install --ignore-scripts >/tmp/tb23-npm.log 2>&1
  if [[ -f ../.env.ci-lab ]]; then
    set -a
    # shellcheck source=/dev/null
    source ../.env.ci-lab
    set +a
  fi
  TESTBENCH_MODE=enabled node run-pipeline.js >/tmp/tb23-run.log 2>&1 || true
  # run-pipeline fires async HTTP on require; wait for capture before curl
  sleep 2
  C="$(curl -s http://127.0.0.1:3023/captured-data)"
  if has_capture_payload "$C"; then ok "23"; else bad "23"; fi
  kill "$(cat /tmp/tb23-mock.pid)" 2>/dev/null || true
}
fi

# --- 24 ---
if smoke_wanted 24; then
note "Scenario 24 slopsquatting"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/24-slopsquatting
  echo '{"captures":[]}' > infrastructure/captured-data.json
  node infrastructure/mock-server.js >/tmp/tb24-mock.log 2>&1 &
  echo $! >/tmp/tb24-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules package-lock.json
  npm install --ignore-scripts >/tmp/tb24-npm.log 2>&1
  TESTBENCH_MODE=enabled npm start >/tmp/tb24-app.log 2>&1 || true
  sleep 2
  C="$(curl -s http://127.0.0.1:3024/captured-data)"
  if has_capture_payload "$C"; then ok "24"; else bad "24"; fi
  kill "$(cat /tmp/tb24-mock.pid)" 2>/dev/null || true
}
fi

# --- 25 ---
if smoke_wanted 25; then
note "Scenario 25 compromised reusable GitHub Action"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/25-compromised-github-action
  echo '{"captures":[]}' > infrastructure/captured-data.json
  if [[ -f ../_shared/plant-lookalike-secrets.sh ]]; then
    bash ../_shared/plant-lookalike-secrets.sh 25 >/tmp/tb25-secrets.log 2>&1 || true
  fi
  node infrastructure/mock-server.js >/tmp/tb25-mock.log 2>&1 &
  echo $! >/tmp/tb25-mock.pid
  sleep 1
  TESTBENCH_MODE=enabled ./run-ci.sh >/tmp/tb25-app.log 2>&1 || true
  sleep 2
  C="$(curl -s http://127.0.0.1:3025/captured-data)"
  if has_capture_payload "$C"; then ok "25"; else bad "25"; fi
  kill "$(cat /tmp/tb25-mock.pid)" 2>/dev/null || true
}
fi

free_common_ports

echo ""
echo "======== SUMMARY ========"
echo "Passed: $pass  Failed: $fail"
exit $((fail > 0 ? 1 : 0))
