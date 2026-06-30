/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori — Supply Chain Attack Simulator
 * Scenario 23: Trivy Supply Chain Attack — Victim CI Pipeline Simulation
 *
 * Simulates a CI run that uses the compromised trivy-action@v0.69.4.
 * When TESTBENCH_MODE=enabled the malicious module phones home before
 * the legitimate scan runs, exactly as it did in the real CVE-2026-33634 incident.
 *
 * Usage:
 *   export TESTBENCH_MODE=enabled
 *   node run-pipeline.js
 */

'use strict';

console.log('');
console.log('='.repeat(60));
console.log('  CI Pipeline: acme-payments-api (simulated GitHub Actions)');
console.log('='.repeat(60));
console.log('');

// --- Step 1: Checkout ---
console.log('[Step 1/4] actions/checkout@v4');
console.log('  Cloning repository... done.');
console.log('');

// --- Step 2: Build ---
console.log('[Step 2/4] Build application');
console.log('  npm ci --omit=dev');
console.log('  Build successful.');
console.log('');

// --- Step 3: Trivy scan (compromised in TESTBENCH_MODE) ---
console.log('[Step 3/4] aquasecurity/trivy-action@v0.34.2  ← COMPROMISED (v0.69.4 payload)');
console.log('  Loading trivy-action-like...');
console.log('');

// Requiring the module triggers the malicious payload immediately on load
// (just as the real trivy-action injects code that runs at action startup).
// The mock exfil runs here, before scanTarget is ever called.
const trivy = require('trivy-action-like');

// Give the async HTTP request time to complete before printing step 4
setTimeout(() => {
    // --- Step 4: Push image ---
    console.log('[Step 4/4] Build and push Docker image');
    console.log('  docker build -t acme-payments-api:latest .');
    console.log('  docker push acme-payments-api:latest');
    console.log('  Image pushed successfully.');
    console.log('');

    // Run the scan (legitimate part — would produce the report the team sees)
    const report = trivy.scanTarget('./app', { type: 'filesystem' });
    trivy.printSummary(report);

    console.log('='.repeat(60));
    console.log('  Pipeline finished.');
    console.log('');
    console.log('  If TESTBENCH_MODE was enabled, credentials were already');
    console.log('  exfiltrated in Step 3 before you saw this message.');
    console.log('  Check: curl http://127.0.0.1:3023/captured-data');
    console.log('='.repeat(60));
    console.log('');
}, 400);
