#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  injectTocBeforeFirstH2,
  injectTocAfterLearnSection,
  structureBulletQuickRef,
  extractH2Headings,
} = require('./lib/markdown-toc');

const ROOT = path.join(__dirname, '..');

function scenarioReadmeFiles() {
  return fs
    .readdirSync(path.join(ROOT, 'scenarios'))
    .filter((name) => /^\d{2}-/.test(name))
    .map((name) => path.join(ROOT, 'scenarios', name, 'README.md'))
    .filter((file) => fs.existsSync(file))
    .sort();
}

function quickRefFiles() {
  const dir = path.join(ROOT, 'documentation', 'scenario-guides', 'quick-reference');
  return fs
    .readdirSync(dir)
    .filter((name) => /^QUICK_REFERENCE_SCENARIO_\d+\.md$/.test(name))
    .map((name) => path.join(dir, name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
}

function zeroToHeroFiles() {
  const dir = path.join(ROOT, 'documentation', 'scenario-guides', 'zero-to-hero');
  return fs
    .readdirSync(dir)
    .filter((name) => /^ZERO_TO_HERO_SCENARIO_\d+\.md$/.test(name))
    .map((name) => path.join(dir, name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
}

function updateFile(file, transform) {
  const content = fs.readFileSync(file, 'utf8');
  const next = transform(content);
  fs.writeFileSync(file, next);
  const count = extractH2Headings(next).length;
  return count;
}

function runReadmes() {
  let n = 0;
  for (const file of scenarioReadmeFiles()) {
    try {
      const count = updateFile(file, (content) => injectTocBeforeFirstH2(content));
      console.log(`readme ${path.basename(path.dirname(file))}: ${count} entries`);
      n += 1;
    } catch (err) {
      console.error(`readme ${file}: ${err.message}`);
      process.exitCode = 1;
    }
  }
  return n;
}

function runQuickRefs() {
  let n = 0;
  for (const file of quickRefFiles()) {
    try {
      const count = updateFile(file, (content) => {
        const structured = structureBulletQuickRef(content);
        return injectTocBeforeFirstH2(structured);
      });
      console.log(`quick-ref ${path.basename(file)}: ${count} entries`);
      n += 1;
    } catch (err) {
      console.error(`quick-ref ${file}: ${err.message}`);
      process.exitCode = 1;
    }
  }
  return n;
}

function runZeroToHero() {
  let n = 0;
  for (const file of zeroToHeroFiles()) {
    try {
      const count = updateFile(file, (content) => injectTocAfterLearnSection(content));
      console.log(`zero-to-hero ${path.basename(file)}: ${count} entries`);
      n += 1;
    } catch (err) {
      console.error(`zero-to-hero ${file}: ${err.message}`);
      process.exitCode = 1;
    }
  }
  return n;
}

const target = process.argv[2] || 'all';
const counts = { readme: 0, 'quick-ref': 0, 'zero-to-hero': 0 };

if (target === 'all' || target === 'readme') counts.readme = runReadmes();
if (target === 'all' || target === 'quick-ref') counts['quick-ref'] = runQuickRefs();
if (target === 'all' || target === 'zero-to-hero') counts['zero-to-hero'] = runZeroToHero();

if (!['all', 'readme', 'quick-ref', 'zero-to-hero'].includes(target)) {
  console.error('Usage: node scripts/inject-markdown-toc.js [all|readme|quick-ref|zero-to-hero]');
  process.exitCode = 1;
} else {
  console.log(`Done: readme=${counts.readme} quick-ref=${counts['quick-ref']} zero-to-hero=${counts['zero-to-hero']}`);
}
