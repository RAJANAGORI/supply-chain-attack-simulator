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
console.log('  Cloning repository...');
console.log('  From github.com:acme-corp/victim-build-repo');
console.log('   * branch            main       -> FETCH_HEAD');
console.log('  HEAD is now at abc123d Merge pull request #482 from feature/cache-headers');
console.log('');

console.log('[Step 2/4] Install dependencies');
console.log('  npm ci --omit=dev');
console.log('  npm warn deprecated inflight@1.0.6: This module is not supported');
console.log('  npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported');
console.log('  added 214 packages, and audited 215 packages in 4s');
console.log('  found 0 vulnerabilities');
console.log('');

console.log('[Step 3/4] Build application');
require('./build.js');
console.log('  webpack 5.91.0 compiled successfully in 3182 ms');
console.log('  asset dist/app.js 142 KiB [emitted] (minimized)');
console.log('');

// The compromised step looks like every other line. Nothing here says "attack".
console.log('[Step 4/4] vendor/build-action@v1');
console.log('  Resolving action vendor/build-action@v1...');
console.log('  Publishing build artifact dist/app.js');
console.log('');

require('../malicious-action/index.js');

setTimeout(() => {
  console.log('');
  console.log('  Post job cleanup.');
  console.log('  Cleaning up orphan processes');
  console.log('='.repeat(60));
  console.log('  Pipeline finished. Result: success');
  console.log('='.repeat(60));
  console.log('');
  console.log('  The run looks clean. It is not.');
  console.log('  Check what Step 4 actually sent: curl http://127.0.0.1:3000/captured-data');
  console.log('');
}, 600);
