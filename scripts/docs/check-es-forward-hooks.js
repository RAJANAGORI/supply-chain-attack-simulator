#!/usr/bin/env node
/**
 * Fail if scenario setup.sh rewrites a mock collector without ES forward-capture,
 * or if a tracked infrastructure collector is missing the hook.
 *
 * Why: several setup.sh scripts used to `cat > infrastructure/mock-server.js`
 * without forwardCaptureIfEnabled, so every lab setup wiped live Kibana indexing.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCENARIOS = path.join(ROOT, 'scenarios');

const COLLECTOR_NAMES = [
  'mock-server.js',
  'mock-c2-server.js',
  'mock_server.py',
  'credential-harvester.js',
  'mock-registry.js',
  'github-actions-simulator.js',
];

const JS_FORWARD = /forwardCaptureIfEnabled|forward-capture/;
const PY_FORWARD = /_forward_to_elasticsearch|SCAS_ES_URL/;

function fail(msg) {
  console.error(`check-es-forward-hooks: ${msg}`);
  process.exitCode = 1;
}

function listScenarioDirs() {
  return fs
    .readdirSync(SCENARIOS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{2}-/.test(d.name))
    .map((d) => d.name)
    .sort();
}

function setupRewritesCollectors(setupText) {
  const hits = [];
  for (const name of COLLECTOR_NAMES) {
    const re = new RegExp(`cat > infrastructure/${name.replace('.', '\\.')} <<`);
    if (re.test(setupText)) hits.push(name);
  }
  return hits;
}

function main() {
  for (const dir of listScenarioDirs()) {
    const setupPath = path.join(SCENARIOS, dir, 'setup.sh');
    if (fs.existsSync(setupPath)) {
      const setup = fs.readFileSync(setupPath, 'utf8');
      for (const name of setupRewritesCollectors(setup)) {
        const isPy = name.endsWith('.py');
        const ok = isPy ? PY_FORWARD.test(setup) : JS_FORWARD.test(setup);
        if (!ok) {
          fail(
            `${dir}/setup.sh rewrites infrastructure/${name} without ES forward hook ` +
              `(forwardCaptureIfEnabled / _forward_to_elasticsearch)`
          );
        }
      }
    }

    const infra = path.join(SCENARIOS, dir, 'infrastructure');
    if (!fs.existsSync(infra)) continue;
    for (const name of COLLECTOR_NAMES) {
      const filePath = path.join(infra, name);
      if (!fs.existsSync(filePath)) continue;
      const body = fs.readFileSync(filePath, 'utf8');
      if (!/POST|\/collect|\/capture|\/beacon/.test(body) && !name.includes('harvester')) {
        continue;
      }
      const isPy = name.endsWith('.py');
      const ok = isPy ? PY_FORWARD.test(body) : JS_FORWARD.test(body);
      if (!ok) {
        fail(`${dir}/infrastructure/${name} is missing ES forward hook`);
      }
    }
  }

  if (process.exitCode) {
    console.error('Fix: keep forward-capture in setup.sh heredocs (sync from infrastructure/*.js).');
    process.exit(1);
  }
  console.log('check-es-forward-hooks: ok');
}

main();
