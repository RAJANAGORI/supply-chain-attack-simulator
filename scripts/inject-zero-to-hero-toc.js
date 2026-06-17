#!/usr/bin/env node
'use strict';

const path = require('path');
const { injectTocAfterLearnSection, extractH2Headings } = require('./lib/markdown-toc');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', 'documentation', 'scenario-guides', 'zero-to-hero');

const files = fs
  .readdirSync(ROOT)
  .filter((name) => /^ZERO_TO_HERO_SCENARIO_\d+\.md$/.test(name))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

let updated = 0;
for (const name of files) {
  const file = path.join(ROOT, name);
  const content = fs.readFileSync(file, 'utf8');
  try {
    const next = injectTocAfterLearnSection(content);
    fs.writeFileSync(file, next);
    console.log(`updated ${name} (${extractH2Headings(next).length} entries)`);
    updated += 1;
  } catch (err) {
    console.error(`${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log(`Done: ${updated} files`);
