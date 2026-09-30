#!/usr/bin/env node

/**
 * Provenance Abuse Detector (Scenario 20)
 * Finds behavioral indicators in a package that has valid provenance and
 * attestation. Valid signatures prove origin and integrity, not safety.
 */

const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'victim-app';
const appDir = path.isAbsolute(target) ? target : path.join(process.cwd(), target);
const pkgDir = path.join(appDir, 'node_modules', 'trusted-logger');
const indexPath = path.join(pkgDir, 'index.js');

function readFile(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

function hasAny(text, needles) {
  return needles.some((n) => text.includes(n));
}

console.log('🔍 Provenance Abuse Detector (Scenario 20)\n');

const index = readFile(indexPath);
if (!index) {
  console.error('❌ trusted-logger not installed. Run: cd victim-app && npm install');
  process.exit(1);
}

function hasAll(text, needles) {
  return needles.every((n) => text.includes(n));
}

const findings = [];
if (index.includes('http.request')) findings.push('Network request in package code');
if (hasAny(index, ['localhost:3020', '127.0.0.1:3020']) || hasAll(index, ['localhost', '3020'])) {
  findings.push('Beacon to mock attacker server');
}
if (index.includes('TESTBENCH_MODE')) findings.push('TESTBENCH_MODE-gated malicious branch');
if (hasAny(index, ['exfil', 'collect'])) findings.push('Exfiltration / collect reference');

const hasProvenance = fs.existsSync(path.join(pkgDir, 'provenance.json'));
const hasAttestation = fs.existsSync(path.join(pkgDir, 'attestation.sigstore.json'));

console.log('Package path:', pkgDir);
console.log('Has npm provenance file:', hasProvenance ? 'YES' : 'NO');
console.log('Has GitHub artifact attestation file:', hasAttestation ? 'YES' : 'NO');

if (findings.length > 0) {
  console.log('\n🚨 Behavioral findings (despite valid provenance / attestation):');
  findings.forEach((f) => console.log(`  - ${f}`));
  console.log('\nConclusion: Provenance and attestation prove WHO built the package and');
  console.log('that the artifact was not tampered with after signing. They do NOT prove');
  console.log('the code is safe when the CI workflow or signing key is compromised.');
  process.exit(2);
}

console.log('\n✅ No obvious behavioral indicators found.');
process.exit(0);
