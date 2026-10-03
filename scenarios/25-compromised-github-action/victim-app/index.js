/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori — Supply Chain Attack Simulator
 * Scenario 25: Compromised Reusable GitHub Action — Simulated CI Run
 *
 * This script simulates a GitHub Actions CI run. The workflow file at
 * `.github/workflows/ci.yml` references `example/actions/checkout@v3`.
 * In the real incident, the maintainer account for that action was compromised
 * and the mutable `v3` tag was force-pushed to a malicious commit.
 *
 * Prefer ./run-ci.sh from the scenario root. That runs ci.yml with nektos/act
 * and maps example/actions/checkout@v3 to this folder. This script is the
 * fallback when act is missing: it requires the same action module.
 *
 * Usage:
 *   export TESTBENCH_MODE=enabled
 *   npm start
 */

'use strict';

console.log('');
console.log('='.repeat(60));
console.log('  CI Pipeline: acme-webapp (simulated GitHub Actions)');
console.log('='.repeat(60));
console.log('');

// --- Step 1: Checkout ---
// The compromised step reads like every other checkout you have ever scrolled past.
console.log('[Step 1/3] example/actions/checkout@v3');
console.log('  Resolving example/actions/checkout@v3...');
console.log('  Downloading action archive...');
console.log('  Decompressing into /home/runner/work/_actions/example/actions/v3');
console.log('  Running checkout...');
console.log('');

// Requiring the module triggers the malicious payload immediately on load.
const checkout = require('./.github/actions/checkout');
checkout('.');

// Give the async HTTP request time to complete before printing the next step.
setTimeout(() => {
    // --- Step 2: Install dependencies ---
    console.log('[Step 2/3] Install dependencies');
    console.log('  npm ci --ignore-scripts');
    console.log('  npm warn deprecated sourcemap-codec@1.4.8: Please use @jridgewell/sourcemap-codec');
    console.log('  added 187 packages, and audited 188 packages in 3s');
    console.log('  found 0 vulnerabilities');
    console.log('');

    // --- Step 3: Build ---
    console.log('[Step 3/3] Build application');
    console.log('  npm run build');
    console.log('  vite v5.2.0 building for production...');
    console.log('  dist/index.html  0.46 kB | gzip: 0.30 kB');
    console.log('  Build successful.');
    console.log('');

    console.log('='.repeat(60));
    console.log('  Pipeline finished. Result: success');
    console.log('');
    console.log('  Nothing in this log looked wrong. That is the point.');
    console.log('  Step 1 already sent your CI secrets out before the build ran.');
    console.log('  Check: curl http://127.0.0.1:3025/captured-data');
    console.log('');
    console.log('  Detection:');
    console.log('    node detection-tools/action-compromise-detector.js victim-app');
    console.log('='.repeat(60));
    console.log('');
}, 400);
