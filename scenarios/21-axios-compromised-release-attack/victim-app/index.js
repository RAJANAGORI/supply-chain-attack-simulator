'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Victim app: imports the HTTP client stand-in only.
 * Malicious transitive (plain-crypto-js-like) is never imported here.
 */
if (process.env.TESTBENCH_MODE !== 'enabled') {
  console.log('Set TESTBENCH_MODE=enabled to run this lab.');
  process.exit(0);
}

const axiosLike = require('axios-like');
const main = require.resolve('axios-like');
const pkgPath = path.join(path.dirname(main), 'package.json');
const p = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

console.log('[victim-app] loaded axios-like', p.version, axiosLike.__testbench);
