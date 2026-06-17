#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  PLAYBOOKS,
  playbookBullets,
  formatReadmePlaybook,
  formatDetectMitigation,
} = require('./lib/mitigation-playbooks');

const ROOT = path.join(__dirname, '..');
const LEARN_MARKER = "## 📚 What You'll Learn";
const LEARN_LINE = '- Apply the **Mitigation Playbook** from this guide and the scenario README';

function stripSection(content, heading) {
  const re = new RegExp(`\\n## ${heading}[\\s\\S]*?(?=\\n## |$)`);
  return content.replace(re, '\n');
}

function injectReadmePlaybook01to06() {
  let n = 0;
  for (const id of ['01', '02', '03', '04', '05', '06']) {
    const file = path.join(ROOT, 'scenarios', PLAYBOOKS[id].scenarioDir, 'README.md');
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('## Mitigation Playbook')) {
      console.log(`readme ${id}: already has Mitigation Playbook`);
      continue;
    }
    const marker = '## ✅ Success Criteria';
    const idx = content.indexOf(marker);
    if (idx === -1) {
      throw new Error(`Success Criteria not found in ${file}`);
    }
    const block = formatReadmePlaybook(playbookBullets(id));
    content = content.slice(0, idx) + block + content.slice(idx);
    fs.writeFileSync(file, content);
    console.log(`readme ${id}: added Mitigation Playbook`);
    n += 1;
  }
  return n;
}

function injectDetectMitigationAll() {
  let n = 0;
  for (const id of Object.keys(PLAYBOOKS)) {
    const file = path.join(ROOT, 'scenarios', PLAYBOOKS[id].scenarioDir, 'DETECT.md');
    if (!fs.existsSync(file)) {
      console.error(`missing DETECT.md for ${id}`);
      process.exitCode = 1;
      continue;
    }
    let content = fs.readFileSync(file, 'utf8').trimEnd();
    content = stripSection(content, 'Mitigation').trimEnd();
    content += `\n\n${formatDetectMitigation(playbookBullets(id))}\n`;
    fs.writeFileSync(file, content);
    console.log(`detect ${id}: added Mitigation section`);
    n += 1;
  }
  return n;
}

function injectLearningObjectives() {
  const dir = path.join(ROOT, 'documentation', 'scenario-guides', 'zero-to-hero');
  let n = 0;
  for (const id of Object.keys(PLAYBOOKS)) {
    const file = path.join(dir, `ZERO_TO_HERO_SCENARIO_${id}.md`);
    let content = fs.readFileSync(file, 'utf8');
    const start = content.indexOf(LEARN_MARKER);
    if (start === -1) continue;
    const after = content.slice(start);
    const endMatch = after.match(/\n---\s*\n/);
    if (!endMatch || endMatch.index === undefined) continue;
    const learnBlock = after.slice(0, endMatch.index);
    if (/mitigation playbook/i.test(learnBlock)) {
      console.log(`learn ${id}: already mentions Mitigation Playbook`);
      continue;
    }
    const insertAt = start + endMatch.index;
    content = `${content.slice(0, insertAt)}\n${LEARN_LINE}\n${content.slice(insertAt)}`;
    fs.writeFileSync(file, content);
    console.log(`learn ${id}: added Mitigation Playbook objective`);
    n += 1;
  }
  return n;
}

const readme = injectReadmePlaybook01to06();
const detect = injectDetectMitigationAll();
const learn = injectLearningObjectives();
console.log(`Done: readme=${readme} detect=${detect} learn=${learn}`);
