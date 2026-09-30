#!/usr/bin/env node
/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori — Supply Chain Attack Simulator
 * Scenario 25: Compromised Reusable GitHub Action — Detector
 *
 * Audits GitHub Actions workflow files for:
 *   1. References to the compromised `example/actions/checkout@v3` action
 *   2. Mutable version tag references instead of immutable SHAs
 *   3. Suspicious behavior in the local action stand-in
 *
 * Usage:
 *   node detection-tools/action-compromise-detector.js [target-dir]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'victim-app'));
const workflowsDir = path.join(targetDir, '.github', 'workflows');
const actionCodePath = path.join(targetDir, '.github', 'actions', 'checkout', 'index.js');
const infraLog = path.join(__dirname, '..', 'infrastructure', 'captured-data.json');

let issues = 0;

function warn(msg) {
    issues += 1;
    console.log(`[!] ${msg}`);
}

function ok(msg) {
    console.log(`[OK] ${msg}`);
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
console.log('Action Compromise Detector — Scenario 25');
console.log('='.repeat(55));
console.log(`Target: ${targetDir}`);
console.log('');

// Audit workflow files
const workflows = findWorkflows(workflowsDir);
console.log(`Found ${workflows.length} workflow file(s).\n`);

workflows.forEach(wf => {
    const content = fs.readFileSync(wf, 'utf8');
    const findings = [];

    if (content.includes('example/actions/checkout@v3')) {
        findings.push('Workflow references compromised action example/actions/checkout@v3.');
    }
    if (/uses:\s+[\w\-]+(\/[\w\-]+)+@v[0-9]+(\.[0-9]+)*/.test(content)) {
        findings.push('Workflow uses mutable version tag instead of immutable commit SHA.');
    }
    if (/\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/.test(content)) {
        findings.push('GITHUB_TOKEN is passed explicitly as an environment variable.');
    }

    if (findings.length === 0) {
        console.log(`File: ${wf}`);
        console.log('  No issues found in this workflow.\n');
    } else {
        console.log(`File: ${wf}`);
        findings.forEach(f => warn(f));
        console.log('');
    }
});

// Audit the local action stand-in
if (fs.existsSync(actionCodePath)) {
    const code = fs.readFileSync(actionCodePath, 'utf8');
    if (code.includes('127.0.0.1:3025') || code.includes('localhost:3025')) {
        warn('Local action stand-in contains a localhost:3025 beacon target.');
    }
    if (code.includes('process.env') && code.includes('http.request')) {
        warn('Local action stand-in reads environment variables and makes HTTP requests.');
    }
    if (code.includes('TESTBENCH_MODE')) {
        ok('Local action stand-in contains TESTBENCH_MODE gate (lab safety feature).');
    }
} else {
    ok('No local action stand-in found at .github/actions/checkout/index.js');
}

// Check mock server capture log
if (fs.existsSync(infraLog)) {
    const log = JSON.parse(fs.readFileSync(infraLog, 'utf8'));
    const n = (log.captures && log.captures.length) || 0;
    if (n > 0) {
        warn(`Mock server log has ${n} compromised-action capture(s).`);
    } else {
        ok('Mock server log is empty.');
    }
} else {
    ok('No infrastructure/captured-data.json yet.');
}

console.log('='.repeat(55));
if (issues > 0) {
    console.log(`Total findings: ${issues}`);
    console.log('');
    console.log('Immediate actions:');
    console.log('  1. Replace every mutable action tag with an immutable commit SHA.');
    console.log('  2. Audit all workflows for example/actions/checkout@v3 or similar compromised references.');
    console.log('  3. Rotate all CI secrets that were accessible to affected pipeline runs.');
    process.exit(1);
} else {
    console.log('No compromised-action indicators detected.');
    process.exit(0);
}
