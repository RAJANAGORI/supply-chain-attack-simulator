#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  PLAYBOOKS,
  playbookBullets,
  formatZeroToHeroPlaybook,
} = require('./lib/mitigation-playbooks');

const ROOT = path.join(__dirname, '..', 'documentation', 'scenario-guides', 'zero-to-hero');
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

  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('## Mitigation Playbook')) {
    console.log(`skip ${id}: already has Mitigation Playbook`);
    skipped += 1;
    continue;
  }

  const idx = content.indexOf(MARKER);
  if (idx === -1) {
    console.error(`Marker not found in scenario ${id}`);
    process.exitCode = 1;
    continue;
  }

  const block = formatZeroToHeroPlaybook(id, playbookBullets(id));
  const next = content.slice(0, idx) + block + content.slice(idx);
  fs.writeFileSync(file, next);
  console.log(`updated ${id}`);
  updated += 1;
}

console.log(`Done: ${updated} updated, ${skipped} skipped`);
