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
  if (!content.includes(MARKER)) {
    console.error(`Marker not found in scenario ${id}`);
    process.exitCode = 1;
    continue;
  }

  const bullets = playbookBullets(id);
  const impl = playbookImplementation(id);
  const block = formatZeroToHeroPlaybook(id, bullets).replace(/\n---\s*\n$/, '\n') +
    formatZeroToHeroImplementation(id, impl);

  // Strip existing Mitigation Playbook and Straightforward Implementation sections if present.
  // Recompute the marker index after strip: removing sections before the marker shifts offsets.
  let stripped = content;
  stripped = stripSection(stripped, 'Mitigation Playbook').trimEnd();
  stripped = stripSection(stripped, 'Straightforward Implementation').trimEnd();

  const insertAt = stripped.indexOf(MARKER);
  if (insertAt === -1) {
    console.error(`Marker missing after strip in scenario ${id}`);
    process.exitCode = 1;
    continue;
  }

  // Keep a single blank line before the injected block so re-runs stay idempotent.
  const prefix = stripped.slice(0, insertAt).replace(/\s+$/, '\n\n');
  const newContent = prefix + block + stripped.slice(insertAt);

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
