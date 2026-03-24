#!/usr/bin/env node

/**
 * Version Confusion Detector (Scenario 20)
 * Flags suspiciously high versions being selected for version-confuser-lib.
 */

const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'victim-app';
const victimRoot = path.isAbsolute(target) ? target : path.join(process.cwd(), target);
const scenarioRoot = path.join(victimRoot, '..');

const installedPath = path.join(victimRoot, 'installed-version.json');
const truth = {
  // In a real lab, you might pin expected versions; here we use a heuristic threshold.
  suspiciousMajorThreshold: 100
};

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

const installed = readJson(installedPath);
console.log('🔍 Version Confusion Detector (Scenario 20)\n');

if (!installed) {
  console.log('❌ Could not read installed-version.json. Run the victim first.');
  process.exit(1);
}

const version = installed.chosenVersion;
console.log('Installed chosenVersion:', version);

const major = parseInt(String(version).split('.')[0], 10) || 0;

if (major >= truth.suspiciousMajorThreshold) {
  console.log('\n🚨 Version confusion suspected: unusually high major version selected.');
  console.log('Recommendation: pin versions (exact), enforce lockfile integrity, and verify registry sources.');
  process.exit(2);
}

console.log('\n✅ Version selection looks normal based on heuristic thresholds.');
process.exit(0);

