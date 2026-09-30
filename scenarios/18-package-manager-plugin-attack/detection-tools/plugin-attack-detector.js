#!/usr/bin/env node

/**
 * pnpm Hook File Detector (Scenario 18)
 * Flags evidence of .pnpmfile.cjs hook-based dependency injection/exfiltration.
 */

const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'victim-app';
const root = path.isAbsolute(target) ? target : path.join(process.cwd(), target);

const pnpmfilePath = path.join(root, '.pnpmfile.cjs');
const lockfilePath = path.join(root, 'pnpm-lock.yaml');
const injectedDepPath = path.join(root, 'node_modules', 'malicious-logger');

function read(p) {
  try {
    if (!fs.existsSync(p)) return '';
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

const pnpmfile = read(pnpmfilePath);
const lockfile = read(lockfilePath);
const injectedDepExists = fs.existsSync(injectedDepPath);
const hookModifiesDeps = pnpmfile.includes('readPackage') && pnpmfile.includes('dependencies');
const exfilEndpoint = pnpmfile.includes('127.0.0.1') || pnpmfile.includes(':3018');
const lockfileHasMaliciousLogger = lockfile.includes('malicious-logger');

console.log('🔍 pnpm Hook File Detector (Scenario 18)\n');

if (hookModifiesDeps || injectedDepExists || lockfileHasMaliciousLogger || exfilEndpoint) {
  console.log('🚨 Potential .pnpmfile.cjs hook compromise detected.');
  if (hookModifiesDeps) console.log('- Found readPackage hook modifying dependencies.');
  if (injectedDepExists) console.log('- Found injected dependency in node_modules: malicious-logger');
  if (lockfileHasMaliciousLogger) console.log('- Found malicious-logger in pnpm-lock.yaml');
  if (exfilEndpoint) console.log('- Found exfiltration endpoint reference in .pnpmfile.cjs');
  console.log('\nMitigation: audit .pnpmfile.cjs, lock hook files in version control, and verify lockfiles in CI.');
  process.exit(2);
}

console.log('✅ No obvious .pnpmfile.cjs hook compromise indicators found.');
console.log('Mitigation: still review hook files and run installs with --frozen-lockfile in CI.');
process.exit(0);
