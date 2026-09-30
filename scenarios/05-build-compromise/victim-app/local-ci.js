/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori - Supply Chain Attack Simulator
 * Scenario 5: Victim CI pipeline simulation
 *
 * Simulates the GitHub Actions run defined in .github/workflows/build.yml.
 * When TESTBENCH_MODE=enabled, the compromised vendor/build-action@v1
 * exfiltrates the GITHUB_TOKEN, environment secrets, and the build artifact.
 *
 * Fallback when nektos/act is missing. Prefer ../run-ci.sh from the scenario root.
 *
 * Usage:
 *   export TESTBENCH_MODE=enabled
 *   set -a && source .env.lab && set +a
 *   npm run ci
 */

'use strict';

const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const match = line.match(/^export\s+([A-Za-z0-9_]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  }
}

process.chdir(__dirname);
loadEnvFile(path.join(__dirname, '.env.lab'));

process.env.TESTBENCH_MODE = process.env.TESTBENCH_MODE || 'enabled';
process.env.GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'ghp_lab_token_05';
process.env.GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'acme-corp/victim-build-repo';
process.env.GITHUB_ACTOR = process.env.GITHUB_ACTOR || 'ci-bot';
process.env.GITHUB_SHA = process.env.GITHUB_SHA || 'abc123def456789';
process.env.GITHUB_REF = process.env.GITHUB_REF || 'refs/heads/main';
process.env.INPUT_ARTIFACT_PATH = process.env.INPUT_ARTIFACT_PATH || 'dist/app.js';

console.log('');
console.log('='.repeat(60));
console.log('  CI Pipeline: victim-build-repo (simulated GitHub Actions)');
console.log('='.repeat(60));
console.log('');

console.log('[Step 1/4] actions/checkout@v4');
console.log('  Cloning repository... done.');
console.log('');

console.log('[Step 2/4] Install dependencies');
console.log('  npm ci --omit=dev');
console.log('  Dependencies installed.');
console.log('');

console.log('[Step 3/4] Build application');
require('./build.js');
console.log('');

console.log('[Step 4/4] vendor/build-action@v1  <- COMPROMISED (force-pushed)');
console.log('  Loading compromised build action...');
console.log('');

require('../malicious-action/index.js');

setTimeout(() => {
  console.log('');
  console.log('='.repeat(60));
  console.log('  Pipeline finished.');
  console.log('');
  console.log('  If TESTBENCH_MODE was enabled, the action exfiltrated');
  console.log('  secrets and artifacts in Step 4.');
  console.log('  Check: curl http://127.0.0.1:3000/captured-data');
  console.log('='.repeat(60));
  console.log('');
}, 600);
