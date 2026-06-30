#!/usr/bin/env node
/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori — Supply Chain Attack Simulator
 * Scenario 23: Trivy Supply Chain Attack — Version Scanner
 *
 * Scans the victim CI directory for indicators of compromise:
 *   - Compromised trivy-action / setup-trivy versions
 *   - Mutable tag references instead of immutable commit SHAs
 *   - tpcp-docs repository references (attacker's exfil backup channel)
 *   - Typosquatted domain references (aquasecurtiy)
 *
 * Usage:
 *   node detection-tools/trivy-version-scanner.js [target-dir]
 *   node detection-tools/trivy-version-scanner.js scenarios/23-trivy-supply-chain-attack/victim-ci
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TARGET_DIR = process.argv[2] || path.join(__dirname, '..', 'victim-ci');

const COMPROMISED_VERSIONS = [
    'trivy-action@v0.34.0', 'trivy-action@v0.34.1', 'trivy-action@v0.34.2',
    'trivy-action@v0.34.3', 'trivy-action@v0.34.4',
    'trivy:0.69.4', 'trivy:0.69.5', 'trivy:0.69.6',
    'aquasec/trivy:0.69.4', 'aquasec/trivy:0.69.5', 'aquasec/trivy:0.69.6',
];

const SAFE_VERSIONS = {
    'trivy-action': 'v0.35.0 or later (pin to SHA: 6e0878da55e5af17e15be7bdc56434b1a7b1f3d8)',
    'setup-trivy': 'v0.2.6 or later',
    'trivy binary': 'v0.69.2 or v0.69.3 (only safe patch releases)',
    'docker image': 'pin to digest, not tag',
};

const IOC_PATTERNS = [
    { pattern: /trivy-action@v0\.34\.[0-9]/, label: 'Compromised trivy-action tag reference', severity: 'CRITICAL' },
    { pattern: /setup-trivy@v0\.[01]\.[0-5]/, label: 'Potentially compromised setup-trivy (check v0.2.5 and below)', severity: 'HIGH' },
    { pattern: /trivy:0\.69\.[456]/, label: 'Compromised Trivy Docker image tag', severity: 'CRITICAL' },
    { pattern: /aquasecurtiy/i, label: 'Typosquatted domain (aquasecurtiy vs aquasecurity)', severity: 'CRITICAL' },
    { pattern: /tpcp-docs/, label: 'Attacker backup exfil repository reference (tpcp-docs)', severity: 'HIGH' },
    { pattern: /scan\.aquasec[uo]rtiy/i, label: 'Known attacker C2 domain', severity: 'CRITICAL' },
    // Mutable tag: uses @vX.Y.Z but not a SHA (warn, not critical — context-dependent)
    { pattern: /aquasecurity\/trivy-action@v[0-9]+\.[0-9]+\.[0-9]+$/, label: 'Mutable version tag — prefer pinning to commit SHA', severity: 'MEDIUM' },
];

let findings = [];
let filesScanned = 0;

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    filesScanned++;

    lines.forEach((line, i) => {
        // Check for compromised versions by string
        COMPROMISED_VERSIONS.forEach(ver => {
            if (line.includes(ver)) {
                findings.push({
                    file: filePath,
                    line: i + 1,
                    severity: 'CRITICAL',
                    label: `Known compromised version: ${ver}`,
                    snippet: line.trim(),
                });
            }
        });

        // Check for IOC patterns
        IOC_PATTERNS.forEach(({ pattern, label, severity }) => {
            if (pattern.test(line)) {
                findings.push({
                    file: filePath,
                    line: i + 1,
                    severity,
                    label,
                    snippet: line.trim(),
                });
            }
        });
    });
}

function walkDir(dir) {
    if (!fs.existsSync(dir)) {
        console.error(`Target directory not found: ${dir}`);
        process.exit(1);
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            walkDir(full);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (['.yml', '.yaml', '.json', '.js', '.sh', '.md', '.txt'].includes(ext)) {
                try {
                    scanFile(full);
                } catch (_) {
                    // Skip unreadable files
                }
            }
        }
    });
}

console.log('');
console.log('Trivy Compromise Scanner — Scenario 23 (CVE-2026-33634)');
console.log('='.repeat(55));
console.log(`Target: ${TARGET_DIR}`);
console.log('');

walkDir(TARGET_DIR);

if (findings.length === 0) {
    console.log(`Scanned ${filesScanned} files — no indicators of compromise found.`);
    console.log('');
    console.log('Note: Also manually verify:');
    console.log('  1. Pipeline logs from March 19-20, 2026');
    console.log('  2. GitHub org for unexpected "tpcp-docs" repositories');
    console.log('  3. Rotate all CI secrets as a precaution');
} else {
    console.log(`Scanned ${filesScanned} files — ${findings.length} finding(s):\n`);

    const bySeverity = ['CRITICAL', 'HIGH', 'MEDIUM'];
    bySeverity.forEach(sev => {
        const group = findings.filter(f => f.severity === sev);
        if (group.length === 0) return;
        console.log(`--- ${sev} (${group.length}) ---`);
        group.forEach(f => {
            console.log(`  [${f.severity}] ${f.label}`);
            console.log(`    File: ${f.file}:${f.line}`);
            console.log(`    Code: ${f.snippet}`);
            console.log('');
        });
    });

    console.log('Safe replacement versions:');
    Object.entries(SAFE_VERSIONS).forEach(([tool, safe]) => {
        console.log(`  ${tool}: ${safe}`);
    });
}

console.log('');
