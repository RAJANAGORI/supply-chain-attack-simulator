#!/usr/bin/env node
/**
 * Compare two local package directories (e.g. legitimate vs compromised).
 * Usage: node compare-versions.js <dirA> <dirB>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const a = process.argv[2];
const b = process.argv[3];

if (!a || !b) {
  console.error('Usage: node compare-versions.js <packageDirA> <packageDirB>');
  console.error('Example: node compare-versions.js ../legitimate-package/secure-validator ../compromised-package/secure-validator');
  process.exit(1);
}

const resolve = (p) => path.resolve(process.cwd(), p);

const dirA = resolve(a);
const dirB = resolve(b);

for (const d of [dirA, dirB]) {
  if (!fs.existsSync(d)) {
    console.error(`Not found: ${d}`);
    process.exit(1);
  }
}

try {
  execSync(`diff -ur "${dirA}" "${dirB}"`, { stdio: 'inherit' });
  console.log('\n(no differences)');
} catch (e) {
  // diff exits 1 when files differ
  if (e.status === 1) {
    process.exit(0);
  }
  throw e;
}
