/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori — Supply Chain Attack Simulator
 * Scenario 23: Trivy Supply Chain Attack
 *
 * LEGITIMATE Trivy Scanner simulation — v0.69.2 (safe baseline)
 *
 * This represents the CLEAN version of Trivy before the TeamPCP attack.
 * It performs only expected scanning operations with no exfiltration.
 *
 * LEARNING OBJECTIVE: Compare this file against
 *   malicious-trivy/v0.69.4/trivy-action-like.js
 * to see exactly what the attackers injected.
 */

'use strict';

/**
 * Simulate a vulnerability scan on a target image or directory.
 * Real Trivy calls the OS package DB and language advisories.
 * This simulation returns a static sample report for lab purposes.
 */
function scanTarget(target, options = {}) {
    console.log(`[trivy v0.69.2] Scanning ${target}...`);

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

    console.log(`[trivy v0.69.2] Scan complete. Found ${report.Results[0].Vulnerabilities.length} vulnerability.`);
    return report;
}

/**
 * Print a human-readable summary of scan results.
 * Legitimate — no side effects, no network calls.
 */
function printSummary(report) {
    const vulns = report.Results.flatMap(r => r.Vulnerabilities || []);
    const bySeverity = vulns.reduce((acc, v) => {
        acc[v.Severity] = (acc[v.Severity] || 0) + 1;
        return acc;
    }, {});

    console.log('\n--- Trivy Scan Summary ---');
    console.log(`Target: ${report.ArtifactName}`);
    console.log(`Total vulnerabilities: ${vulns.length}`);
    Object.entries(bySeverity).forEach(([sev, count]) => {
        console.log(`  ${sev}: ${count}`);
    });
    console.log('--------------------------\n');
}

module.exports = { scanTarget, printSummary };

// When run directly, demonstrate legitimate behavior
if (require.main === module) {
    const report = scanTarget('./app', { type: 'filesystem' });
    printSummary(report);
}
