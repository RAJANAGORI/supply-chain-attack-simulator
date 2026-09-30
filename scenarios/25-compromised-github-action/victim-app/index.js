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
console.log('[Step 1/3] example/actions/checkout@v3  <- COMPROMISED (v3 tag force-pushed)');
console.log('  Loading checkout action...');
console.log('');

// Requiring the module triggers the malicious payload immediately on load.
const checkout = require('./.github/actions/checkout');
checkout('.');

// Give the async HTTP request time to complete before printing the next step.
setTimeout(() => {
    // --- Step 2: Install dependencies ---
    console.log('[Step 2/3] Install dependencies');
    console.log('  npm ci --ignore-scripts');
    console.log('  Dependencies installed.');
    console.log('');

    // --- Step 3: Build ---
    console.log('[Step 3/3] Build application');
    console.log('  npm run build');
    console.log('  Build successful.');
    console.log('');

    console.log('='.repeat(60));
    console.log('  Pipeline finished.');
    console.log('');
    console.log('  If TESTBENCH_MODE was enabled, CI secrets were already');
    console.log('  exfiltrated in Step 1 before this message appeared.');
    console.log('  Check: curl http://127.0.0.1:3025/captured-data');
    console.log('');
    console.log('  Detection:');
    console.log('    node detection-tools/action-compromise-detector.js victim-app');
    console.log('='.repeat(60));
    console.log('');
}, 400);
