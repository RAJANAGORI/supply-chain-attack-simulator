#!/usr/bin/env node

/**
 * Package Cache Poisoning Detector (Scenario 16)
 * Checks whether the scenario cache contains a malicious payload and recommends clearing it.
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

const scenarioRoot = path.join(process.cwd());
// When called with "victim-app" from the dashboard, cwd might be scenario root or elsewhere.
const target = process.argv[2] || '.';
const root = path.isAbsolute(target) ? target : path.join(process.cwd(), target);

const cachePath = path.join(root, 'cache', 'cache-lib', 'index.js');
const index = readIfExists(cachePath);

const suspicious = (index || '').includes('localhost:3016') || (index || '').includes('package-cache-poisoning');

console.log('🔍 Cache Poisoning Detector (Scenario 16)\n');
if (!index) {
  console.log('❌ Could not find cache-lib code. Expected:', cachePath);
  process.exit(1);
}

if (suspicious) {
  console.log('🚨 Cache poisoning suspected: exfiltration endpoint found in cache/lib code.');
  console.log('\nRecommendation:');
  console.log(' - Clear local npm cache / poisoned cache directories');
  console.log(' - Reinstall dependencies in a clean environment');
  process.exit(2);
}

console.log('✅ No obvious cache poisoning indicators found.');
process.exit(0);

