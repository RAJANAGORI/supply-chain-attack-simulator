#!/usr/bin/env node

/**
 * Developer Tool Compromise Detector (Scenario 15)
 * Flags malicious postinstall/exfiltration patterns in installed dev tools.
 */

const fs = require('fs');
const path = require('path');

function readIfExists(p) {
  try {
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    return null;
  }
}

function detect(victimDir) {
  const results = [];
  const toolPkgPath = path.join(victimDir, 'node_modules', 'dev-tool', 'package.json');
  const postinstallPath = path.join(victimDir, 'node_modules', 'dev-tool', 'postinstall.js');
  const indexPath = path.join(victimDir, 'node_modules', 'dev-tool', 'index.js');

  const pkgJsonRaw = readIfExists(toolPkgPath);
  if (!pkgJsonRaw) {
    return { findings: [{ severity: 'WARNING', message: 'dev-tool not installed in victim node_modules' }], exitCode: 0 };
  }

  const pkg = JSON.parse(pkgJsonRaw);
  const hasPostinstall = !!(pkg.scripts && pkg.scripts.postinstall);
  if (hasPostinstall) {
    results.push({ severity: 'INFO', message: `dev-tool defines postinstall: ${pkg.scripts.postinstall}` });
  }

  const postinstall = readIfExists(postinstallPath) || '';
  const index = readIfExists(indexPath) || '';
  const suspicious = ['localhost:3015', '/collect'].some((needle) => (postinstall + index).includes(needle));

  if (suspicious) {
    results.push({
      severity: 'CRITICAL',
      message: 'Potential developer tool compromise: exfiltration to localhost:3015 detected'
    });
    return { findings: results, exitCode: 2 };
  }

  results.push({ severity: 'OK', message: 'No obvious dev-tool exfiltration patterns detected' });
  return { findings: results, exitCode: 0 };
}

const target = process.argv[2] || 'victim-app';
const victimDir = path.isAbsolute(target) ? target : path.join(process.cwd(), target);

const { findings, exitCode } = detect(victimDir);
console.log('🔍 Developer Tool Compromise Detector (Scenario 15)\n');
findings.forEach((f) => {
  console.log(`[${f.severity}] ${f.message}`);
});

console.log('\nRecommendation: pin and verify developer tools, isolate build tooling, and disable untrusted postinstall scripts.');
process.exit(exitCode);

