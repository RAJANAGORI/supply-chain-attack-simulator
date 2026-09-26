#!/usr/bin/env node
/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori — Supply Chain Attack Simulator
 * Scenario 24: Slopsquatting Detector
 *
 * Scans a victim application for the LLM-hallucinated package IOC and
 * checks the mock server capture log for beacons.
 *
 * Usage:
 *   node detection-tools/slopsquat-detector.js [path-to-victim-app]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..', 'victim-app'));
const packageJsonPath = path.join(root, 'package.json');
const packageLockPath = path.join(root, 'package-lock.json');
const installedPkgPath = path.join(root, 'node_modules', 'array-sortify', 'index.js');
const infraLog = path.join(__dirname, '..', 'infrastructure', 'captured-data.json');

let issues = 0;

function warn(msg) {
    issues += 1;
    console.log(`[!] ${msg}`);
}

function ok(msg) {
    console.log(`[OK] ${msg}`);
}

if (!fs.existsSync(root)) {
    console.error('Victim path not found:', root);
    process.exit(2);
}

// Check dependency manifests for the hallucinated package name
const manifests = [];
if (fs.existsSync(packageJsonPath)) manifests.push(packageJsonPath);
if (fs.existsSync(packageLockPath)) manifests.push(packageLockPath);

let foundInManifest = false;
manifests.forEach(p => {
    const raw = fs.readFileSync(p, 'utf8');
    if (raw.includes('array-sortify')) {
        foundInManifest = true;
        warn(`Dependency manifest references hallucinated package: ${p}`);
    }
});

if (!foundInManifest) {
    ok('No dependency manifest references "array-sortify".');
}

// Check installed package code for suspicious behavior
if (fs.existsSync(installedPkgPath)) {
    const code = fs.readFileSync(installedPkgPath, 'utf8');
    if (code.includes('127.0.0.1:3024') || code.includes('localhost:3024')) {
        warn('Installed array-sortify contains a localhost:3024 beacon target.');
    }
    if (code.includes('process.env') && code.includes('http.request')) {
        warn('Installed array-sortify reads environment variables and makes HTTP requests on load.');
    }
    if (code.includes('TESTBENCH_MODE')) {
        ok('Installed package contains TESTBENCH_MODE gate (lab safety feature).');
    }
} else {
    ok('array-sortify is not installed in node_modules.');
}

// Check mock server capture log
if (fs.existsSync(infraLog)) {
    const log = JSON.parse(fs.readFileSync(infraLog, 'utf8'));
    const n = (log.captures && log.captures.length) || 0;
    if (n > 0) {
        warn(`Mock server log has ${n} slopsquat beacon capture(s).`);
    } else {
        ok('Mock server log is empty.');
    }
} else {
    ok('No infrastructure/captured-data.json yet.');
}

console.log('-'.repeat(55));
if (issues > 0) {
    console.log(`Findings: ${issues}`);
    console.log('');
    console.log('Recommended actions:');
    console.log('  1. Verify any new package name against the public registry before install.');
    console.log('  2. Uninstall the hallucinated package and review source code.');
    console.log('  3. Rotate any credentials that were present in the victim environment.');
    process.exit(1);
} else {
    console.log('No slopsquatting indicators detected.');
    process.exit(0);
}
