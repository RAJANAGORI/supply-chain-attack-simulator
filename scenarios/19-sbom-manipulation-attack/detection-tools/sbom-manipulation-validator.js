#!/usr/bin/env node

/**
 * SBOM Manipulation Validator (Scenario 19)
 * Regenerates expected dependency truth and compares against generated sbom.json.
 */

const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'victim-app';
const root = path.isAbsolute(target) ? target : path.join(process.cwd(), target);
const victimRoot = root;
const scenarioRoot = path.join(victimRoot, '..');

const sbomPath = path.join(victimRoot, 'sbom.json');
const truthPath = path.join(scenarioRoot, 'truth', 'dependencies.json');

function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

const truth = readJson(truthPath, null);
const sbom = readJson(sbomPath, null);

console.log('🔍 SBOM Manipulation Validator (Scenario 19)\n');

if (!truth) {
  console.log('❌ Could not read truth dependencies.');
  process.exit(1);
}
if (!sbom) {
  console.log('❌ Could not read sbom.json. Run the victim first.');
  process.exit(1);
}

const truthDeps = truth.dependencies || [];
const sbomDeps = sbom.dependencies || [];

const missing = truthDeps.filter((d) => !sbomDeps.includes(d));
const extra = sbomDeps.filter((d) => !truthDeps.includes(d));

console.log('Truth deps:', truthDeps.join(', ') || '(none)');
console.log('SBOM deps:', sbomDeps.join(', ') || '(none)');

if (missing.length || extra.length) {
  console.log('\n🚨 SBOM mismatch detected.');
  if (missing.length) console.log('Missing from SBOM:', missing.join(', '));
  if (extra.length) console.log('Unexpected in SBOM:', extra.join(', '));
  console.log('\nMitigation: validate SBOM authenticity, cross-check against actual dependency truth, and avoid trusting a single generator.');
  process.exit(2);
}

console.log('\n✅ SBOM matches expected dependency truth.');
console.log('Mitigation: keep SBOM pipelines reproducible and signed.');
process.exit(0);

