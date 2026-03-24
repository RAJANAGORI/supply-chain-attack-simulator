#!/usr/bin/env node

/**
 * Multi-Stage Attack Chain Detector (Scenario 17)
 * Verifies that evidence includes stage1, stage2, and stage3 in the expected attack chain.
 */

const fs = require('fs');
const path = require('path');

const scenarioRoot = process.argv[2] || '.';
const root = path.isAbsolute(scenarioRoot) ? scenarioRoot : path.join(process.cwd(), scenarioRoot);
const evidencePath = path.join(root, 'infrastructure', 'captured-data.json');

function readEvidence() {
  if (!fs.existsSync(evidencePath)) return { captures: [] };
  try {
    return JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  } catch (e) {
    return { captures: [] };
  }
}

const evidence = readEvidence();
const stages = new Set();

for (const cap of evidence.captures || []) {
  const data = cap.data || cap;
  if (data && data.stage) stages.add(data.stage);
}

console.log('🔍 Multi-Stage Attack Chain Detector (Scenario 17)\n');
console.log('Observed stages:', Array.from(stages).sort().join(', ') || '(none)');

const required = ['stage1', 'stage2', 'stage3'];
const missing = required.filter((s) => !stages.has(s));

if (missing.length) {
  console.log('\n⚠️  Incomplete multi-stage evidence.');
  console.log('Missing:', missing.join(', '));
  console.log('\nRecommendation: check whether setup/victim steps executed correctly before detection.');
  process.exit(1);
}

console.log('\n🚨 Multi-stage chain detected (stage1->stage2->stage3).');
console.log('\nMitigation suggestions: defense in depth (dependency pinning + behavioral detection + incident containment).');
process.exit(2);

