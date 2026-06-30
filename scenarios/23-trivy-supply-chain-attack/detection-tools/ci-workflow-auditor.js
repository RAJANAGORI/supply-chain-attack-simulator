#!/usr/bin/env node
/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori — Supply Chain Attack Simulator
 * Scenario 23: Trivy Supply Chain Attack — CI Workflow Auditor
 *
 * Audits GitHub Actions workflow files for:
 *   1. Actions pinned to mutable tags instead of immutable SHAs
 *   2. Overly permissive write permissions
 *   3. pull_request_target with checkout (the initial attack vector)
 *   4. Use of compromised Trivy versions
 *
 * In the real CVE-2026-33634 incident, the initial access came from
 * a misconfigured pull_request_target workflow in Trivy's own repo.
 *
 * Usage:
 *   node detection-tools/ci-workflow-auditor.js [target-dir]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TARGET_DIR = process.argv[2] || path.join(__dirname, '..', 'victim-ci');

const CHECKS = [
    {
        id: 'WF-01',
        label: 'pull_request_target with actions/checkout (initial attack vector)',
        severity: 'CRITICAL',
        test: (content) =>
            /pull_request_target/.test(content) &&
            /actions\/checkout/.test(content),
        detail: 'pull_request_target has write permissions and access to secrets. Combined with ' +
                'checkout of PR code, an attacker can steal the GITHUB_TOKEN. This was how ' +
                'TeamPCP initially gained access to Trivy\'s repository.',
        fix: 'Do not check out untrusted PR code in pull_request_target workflows. ' +
             'Separate the checkout into a pull_request workflow with read-only permissions.',
    },
    {
        id: 'WF-02',
        label: 'Mutable action tag reference (should be pinned to SHA)',
        severity: 'HIGH',
        test: (content) =>
            /uses:\s+[\w\-]+\/[\w\-]+@v[0-9]+\.[0-9]+\.[0-9]+/.test(content),
        detail: 'Version tags (e.g. @v1.2.3) can be force-pushed by anyone with write access ' +
                'to the source repo. This is exactly how CVE-2026-33634 was weaponized: ' +
                'attackers force-pushed 76 existing tags to point to malicious commits.',
        fix: 'Pin every action to its full commit SHA: uses: owner/repo@FULL_SHA_HERE',
    },
    {
        id: 'WF-03',
        label: 'Overly broad write permissions',
        severity: 'MEDIUM',
        test: (content) =>
            /permissions:\s*write-all/.test(content) ||
            /permissions:\s*\n\s+.*:\s+write/.test(content),
        detail: 'Granting write permissions to all scopes increases the blast radius if ' +
                'a supply chain action is compromised.',
        fix: 'Use least-privilege permissions. Explicitly list only what is needed.',
    },
    {
        id: 'WF-04',
        label: 'GITHUB_TOKEN passed as environment variable to action',
        severity: 'MEDIUM',
        test: (content) =>
            /\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/.test(content),
        detail: 'Explicitly passing GITHUB_TOKEN as an env var increases visibility and ' +
                'leakage risk compared to the default token binding.',
        fix: 'Prefer the implicit token binding and grant only needed permissions.',
    },
    {
        id: 'WF-05',
        label: 'Compromised trivy-action version (CVE-2026-33634)',
        severity: 'CRITICAL',
        test: (content) =>
            /trivy-action@v0\.34\.[0-9]/.test(content) ||
            /setup-trivy@v0\.[01]\.[0-5]/.test(content),
        detail: 'These versions were compromised by TeamPCP on March 19, 2026. ' +
                'Any CI run using these references after that date may have exfiltrated secrets.',
        fix: 'Update to trivy-action@v0.35.0 (pin to SHA) and setup-trivy@v0.2.6+. ' +
             'Rotate all CI secrets immediately.',
    },
];

function auditWorkflow(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = [];

    CHECKS.forEach(check => {
        if (check.test(content)) {
            results.push({ ...check, file: filePath });
        }
    });

    return results;
}

function findWorkflows(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            findWorkflows(full).forEach(r => results.push(r));
        } else if (entry.isFile() && /\.(yml|yaml)$/.test(entry.name)) {
            results.push(full);
        }
    });
    return results;
}

console.log('');
console.log('CI Workflow Auditor — Scenario 23 (CVE-2026-33634)');
console.log('='.repeat(55));
console.log(`Target: ${TARGET_DIR}`);
console.log('');

const workflows = findWorkflows(TARGET_DIR);

if (workflows.length === 0) {
    console.log('No workflow files found. Run from the victim-ci directory.');
    process.exit(0);
}

console.log(`Found ${workflows.length} workflow file(s).\n`);

let totalFindings = 0;

workflows.forEach(wf => {
    const findings = auditWorkflow(wf);
    console.log(`File: ${wf}`);

    if (findings.length === 0) {
        console.log('  No issues found in this workflow.\n');
    } else {
        totalFindings += findings.length;
        findings.forEach(f => {
            console.log(`  [${f.severity}] ${f.id}: ${f.label}`);
            console.log(`    Why: ${f.detail}`);
            console.log(`    Fix: ${f.fix}`);
            console.log('');
        });
    }
});

console.log('='.repeat(55));
console.log(`Total findings: ${totalFindings}`);
if (totalFindings > 0) {
    console.log('');
    console.log('Immediate actions:');
    console.log('  1. Pin all action references to immutable commit SHAs');
    console.log('  2. Update trivy-action to v0.35.0+ and setup-trivy to v0.2.6+');
    console.log('  3. Rotate all CI secrets exposed in pipelines after March 19 2026');
    console.log('  4. Check GitHub org for unexpected "tpcp-docs" repositories');
}
console.log('');
