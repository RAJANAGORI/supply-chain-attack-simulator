#!/usr/bin/env node
'use strict';

/**
 * Blue-team helper: lockfile IOC + local marker + optional beacon log.
 * Usage: node detection-tools/axios-compromise-detector.js [path-to-victim-app]
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..', 'victim-app'));
const lock = path.join(root, 'package-lock.json');
const marker = path.join(root, '.testbench-axios-ioc.json');
const infraLog = path.join(__dirname, '..', 'infrastructure', 'captured-data.json');

let issues = 0;

function warn(msg) {
  issues += 1;
  console.log(`[!] ${msg}`);
}

function ok(msg) {
  console.log(`[✓] ${msg}`);
}

if (!fs.existsSync(root)) {
  console.error('Victim path not found:', root);
  process.exit(2);
}

if (fs.existsSync(lock)) {
  const raw = fs.readFileSync(lock, 'utf8');
  if (raw.includes('plain-crypto-js-like')) {
    warn('package-lock.json references plain-crypto-js-like (unexpected transitive IOC).');
  } else {
    ok('package-lock.json has no plain-crypto-js-like entry.');
  }
} else {
  ok('No package-lock.json (generate with npm install --package-lock-only if needed).');
}

if (fs.existsSync(marker)) {
  warn(`IOC marker present: ${marker}`);
  console.log(fs.readFileSync(marker, 'utf8'));
} else {
  ok('No .testbench-axios-ioc.json marker.');
}

if (fs.existsSync(infraLog)) {
  const j = JSON.parse(fs.readFileSync(infraLog, 'utf8'));
  const n = (j.beacons && j.beacons.length) || 0;
  if (n > 0) {
    warn(`Mock server log has ${n} beacon(s).`);
  } else {
    ok('Mock server log empty.');
  }
} else {
  ok('No infrastructure/captured-data.json yet.');
}

const nm = path.join(root, 'node_modules', 'plain-crypto-js-like', 'package.json');
if (fs.existsSync(nm)) {
  const pkg = JSON.parse(fs.readFileSync(nm, 'utf8'));
  if (pkg.scripts && pkg.scripts.postinstall) {
    warn('Installed plain-crypto-js-like still has postinstall script (manifest swap may not have run).');
  } else {
    ok('Installed plain-crypto-js-like manifest looks like decoy (no postinstall).');
  }
}

process.exit(issues > 0 ? 1 : 0);
