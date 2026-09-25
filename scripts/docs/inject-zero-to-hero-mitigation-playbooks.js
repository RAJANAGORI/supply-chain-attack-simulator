#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  PLAYBOOKS,
  playbookBullets,
  playbookImplementation,
  formatZeroToHeroPlaybook,
  formatZeroToHeroImplementation,
} = require('../lib/mitigation-playbooks');

const ROOT = path.join(__dirname, '../..', 'documentation', 'scenario-guides', 'zero-to-hero');
const MARKER = '## Elasticsearch + Kibana observability (optional)';

let updated = 0;
let skipped = 0;

for (const id of Object.keys(PLAYBOOKS)) {
  const file = path.join(ROOT, `ZERO_TO_HERO_SCENARIO_${id}.md`);
  if (!fs.existsSync(file)) {
    console.error(`Missing: ${file}`);
    process.exitCode = 1;
    continue;
  }

  let content = fs.readFileSync(file, 'utf8');
  const idx = content.indexOf(MARKER);
  if (idx === -1) {
    console.error(`Marker not found in scenario ${id}`);
    process.exitCode = 1;
    continue;
  }

  if (content.includes('## Straightforward Implementation')) {
    console.log(`skip ${id}: already has Straightforward Implementation`);
    skipped += 1;
    continue;
  }

  const bullets = playbookBullets(id);
  const impl = playbookImplementation(id);
  const block = formatZeroToHeroPlaybook(id, bullets).replace(/\n---\s*\n$/, '\n') +
    formatZeroToHeroImplementation(impl);
  const next = content.slice(0, idx) + block + content.slice(idx);
  fs.writeFileSync(file, next);
  console.log(`updated ${id}`);
  updated += 1;
}

console.log(`Done: ${updated} updated, ${skipped} skipped`);
