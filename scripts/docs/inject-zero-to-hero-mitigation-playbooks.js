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

function stripSection(content, heading) {
  const re = new RegExp(`\\n## ${heading}[\\s\\S]*?(?=\\n## |$)`);
  return content.replace(re, '\n');
}

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

  const bullets = playbookBullets(id);
  const impl = playbookImplementation(id);
  const block = formatZeroToHeroPlaybook(id, bullets).replace(/\n---\s*\n$/, '\n') +
    formatZeroToHeroImplementation(id, impl);

  // Strip existing Mitigation Playbook and Straightforward Implementation sections if present
  let stripped = content;
  stripped = stripSection(stripped, 'Mitigation Playbook').trimEnd();
  stripped = stripSection(stripped, 'Straightforward Implementation').trimEnd();

  const newContent = stripped.slice(0, idx) + block + stripped.slice(idx);

  if (newContent === content) {
    console.log(`skip ${id}: content unchanged`);
    skipped += 1;
    continue;
  }

  fs.writeFileSync(file, newContent);
  console.log(`updated ${id}`);
  updated += 1;
}

console.log(`Done: ${updated} updated, ${skipped} skipped`);
