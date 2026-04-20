#!/usr/bin/env bash
# Run lightweight end-to-end checks for each scenario (TESTBENCH_MODE safety on).
# Requires: node, npm, python3, curl. Run from repo root: ./scripts/smoke-all-scenarios.sh
set +m
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORTS_FILE="${ROOT}/scripts/ports.env"
export TESTBENCH_MODE=enabled

kill_on() {
  local p="$1"
  local pids
  pids="$(lsof -ti ":${p}" 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
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

# --- 01 ---
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

# --- 02 ---
note "Scenario 02 dependency confusion"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/02-dependency-confusion
  cp templates/dependency-confusion-template.js attacker-packages/@techcorp/auth-lib/index.js
  node infrastructure/mock-server.js >/tmp/tb02-mock.log 2>&1 &
  echo $! >/tmp/tb02-mock.pid
  sleep 1
  cd corporate-app
  rm -rf node_modules package-lock.json
  npm install >/tmp/tb02-npm1.log 2>&1
  npm install ../attacker-packages/@techcorp/auth-lib >/tmp/tb02-npm2.log 2>&1
  TESTBENCH_MODE=enabled node index.js >/tmp/tb02-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "02"; else bad "02"; fi
  kill "$(cat /tmp/tb02-mock.pid)" 2>/dev/null || true
}

# --- 03 ---
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

# --- 04 ---
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

# --- 05 ---
note "Scenario 05 build compromise"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/05-build-compromise
  node infrastructure/mock-server.js >/tmp/tb05-mock.log 2>&1 &
  echo $! >/tmp/tb05-mock.pid
  sleep 1
  cd compromised-build
  TESTBENCH_MODE=enabled AWS_ACCESS_KEY_ID=x AWS_SECRET_ACCESS_KEY=y DATABASE_PASSWORD=z npm run build >/tmp/tb05-build.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "05"; else bad "05"; fi
  kill "$(cat /tmp/tb05-mock.pid)" 2>/dev/null || true
}

# --- 06 ---
note "Scenario 06 sha-hulud"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/06-sha-hulud/infrastructure
  node mock-cdn.js >/tmp/tb06-cdn.log 2>&1 &
  echo $! >/tmp/tb06-cdn.pid
  node credential-harvester.js >/tmp/tb06-harv.log 2>&1 &
  echo $! >/tmp/tb06-harv.pid
  sleep 1
  cd ../victim-app
  rm -rf node_modules package-lock.json
  TESTBENCH_MODE=enabled npm install ../compromised-package/data-processor >/tmp/tb06-npm.log 2>&1
  C="$(curl -s http://127.0.0.1:3001/captured-credentials)"
  if has_capture_payload "$C"; then ok "06"; else bad "06"; fi
  kill "$(cat /tmp/tb06-cdn.pid)" "$(cat /tmp/tb06-harv.pid)" 2>/dev/null || true
}

# --- 07 ---
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

# --- 08 ---
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

# --- 09 ---
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

# --- 10 ---
note "Scenario 10 git submodule"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/10-git-submodule-attack
  node infrastructure/mock-server.js >/tmp/tb10-mock.log 2>&1 &
  echo $! >/tmp/tb10-mock.pid
  sleep 1
  TESTBENCH_MODE=enabled bash malicious-submodule/postinstall.sh >/tmp/tb10-sh.log 2>&1
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "10"; else bad "10"; fi
  kill "$(cat /tmp/tb10-mock.pid)" 2>/dev/null || true
}

# --- 11 ---
note "Scenario 11 registry mirror poisoning"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/11-registry-mirror-poisoning
  node infrastructure/mock-server.js >/tmp/tb11-mock.log 2>&1 &
  echo $! >/tmp/tb11-mock.pid
  sleep 1
  cd corporate-app
  rm -rf node_modules package-lock.json
  npm install >/tmp/tb11-npm.log 2>&1
  TESTBENCH_MODE=enabled node index.js >/tmp/tb11-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "11"; else bad "11"; fi
  kill "$(cat /tmp/tb11-mock.pid)" 2>/dev/null || true
}

# --- 12 ---
note "Scenario 12 workspace monorepo"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/12-workspace-monorepo-attack
  node infrastructure/mock-server.js >/tmp/tb12-mock.log 2>&1 &
  echo $! >/tmp/tb12-mock.pid
  sleep 1
  rm -rf packages node_modules package-lock.json
  mkdir -p packages
  cp -r legitimate-packages/* packages/
  npm install >/tmp/tb12-npm1.log 2>&1
  cp -r compromised-package/utils packages/utils
  TESTBENCH_MODE=enabled npm install >/tmp/tb12-npm2.log 2>&1
  C="$(curl -s http://127.0.0.1:3000/captured-data)"
  if has_capture_payload "$C"; then ok "12"; else bad "12"; fi
  kill "$(cat /tmp/tb12-mock.pid)" 2>/dev/null || true
}

# --- 13 ---
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

# --- 14 ---
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

# --- 15 ---
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

# --- 16 ---
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

# --- 17 ---
note "Scenario 17 multi-stage attack chain"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/17-multi-stage-attack-chain
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

# --- 18 ---
note "Scenario 18 package manager plugin"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/18-package-manager-plugin-attack
  node infrastructure/mock-server.js >/tmp/tb18-mock.log 2>&1 &
  echo $! >/tmp/tb18-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules
  TESTBENCH_MODE=enabled npm start >/tmp/tb18-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3018/captured-data)"
  if has_capture_payload "$C"; then ok "18"; else bad "18"; fi
  kill "$(cat /tmp/tb18-mock.pid)" 2>/dev/null || true
}

# --- 19 ---
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

# --- 20 ---
note "Scenario 20 package version confusion"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/20-package-version-confusion
  node infrastructure/mock-server.js >/tmp/tb20-mock.log 2>&1 &
  echo $! >/tmp/tb20-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules package-lock.json
  npm install >/tmp/tb20-npm.log 2>&1
  TESTBENCH_MODE=enabled npm start >/tmp/tb20-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3020/captured-data)"
  if has_capture_payload "$C"; then ok "20"; else bad "20"; fi
  kill "$(cat /tmp/tb20-mock.pid)" 2>/dev/null || true
}

# --- 21 ---
note "Scenario 21 axios-style release"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/21-axios-compromised-release-attack
  node infrastructure/mock-server.js >/tmp/tb21-mock.log 2>&1 &
  echo $! >/tmp/tb21-mock.pid
  sleep 1
  cd victim-app
  rm -rf node_modules package-lock.json
  TESTBENCH_MODE=enabled npm install axios-like@file:../packages/axios-like-1.14.1.tgz >/tmp/tb21-npm.log 2>&1
  TESTBENCH_MODE=enabled npm start >/tmp/tb21-app.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3021/captured-data)"
  if has_capture_payload "$C"; then ok "21"; else bad "21"; fi
  kill "$(cat /tmp/tb21-mock.pid)" 2>/dev/null || true
}

# --- 22 ---
note "Scenario 22 litellm PyPI style"
free_common_ports
{
  cd "$ROOT"
  cd scenarios/22-litellm-pypi-compromise
  python3 infrastructure/mock_server.py >/tmp/tb22-mock.log 2>&1 &
  echo $! >/tmp/tb22-mock.pid
  sleep 1
  cd victim-app
  # shellcheck source=/dev/null
  source .venv/bin/activate
  pip install -U -q ../python-packages/v1_82_7 >/tmp/tb22-pip.log 2>&1
  TESTBENCH_MODE=enabled python run_victim.py >/tmp/tb22-run.log 2>&1 || true
  C="$(curl -s http://127.0.0.1:3022/captured-data)"
  if has_capture_payload "$C"; then ok "22"; else bad "22"; fi
  kill "$(cat /tmp/tb22-mock.pid)" 2>/dev/null || true
}

free_common_ports

echo ""
echo "======== SUMMARY ========"
echo "Passed: $pass  Failed: $fail"
exit $((fail > 0 ? 1 : 0))
