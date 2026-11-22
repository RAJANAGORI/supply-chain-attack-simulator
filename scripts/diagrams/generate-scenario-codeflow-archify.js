#!/usr/bin/env node
/**
 * Archify workflow for each lab's code path.
 * Writes .archify/scenarios/NN-slug/workflow/candidate.json
 *
 *   node scripts/diagrams/generate-scenario-codeflow-archify.js
 *
 * Then finalize with the Archify CLI (showcase). This script does not call it.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const META = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'detection-tools/es/scenario-observability.json'), 'utf8')
);

function clip(value, max) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return text.slice(0, max - 3).trim() + '...';
}

function node(fields) {
  return fields;
}

function revision() {
  return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
}

function lineOf(absPath, needle) {
  if (!fs.existsSync(absPath)) return null;
  const lines = fs.readFileSync(absPath, 'utf8').split('\n');
  const idx = lines.findIndex((line) => line.includes(needle));
  return idx === -1 ? null : idx + 1;
}

function source(rel, line, label) {
  const item = { path: rel, label: clip(label, 48) };
  if (line) item.line = line;
  return item;
}

function trackedFiles() {
  const out = execSync('git ls-files scenarios', { cwd: ROOT, encoding: 'utf8' });
  return new Set(out.split('\n').filter(Boolean));
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'infrastructure',
  'build',
  'dist',
  '__pycache__',
  '.venv',
  'venv',
]);

function payloadSource(folder, tracked) {
  const root = path.join(ROOT, 'scenarios', folder);
  const hits = [];
  function walk(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      return;
    }
    for (const ent of entries) {
      if (SKIP_DIRS.has(ent.name)) continue;
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!/\.(js|mjs|cjs|py|sh)$/.test(ent.name)) continue;
      if (ent.name === 'setup.sh') continue;
      const rel = path.relative(ROOT, abs).split(path.sep).join('/');
      if (tracked && !tracked.has(rel)) continue;
      const found = lineOf(abs, 'TESTBENCH_MODE');
      if (found) {
        hits.push({ path: rel, line: found });
      }
    }
  }
  walk(root);
  return hits[0] || null;
}

function candidate(scenario, rev, tracked) {
  const id = scenario.scenario_id;
  const folder = scenario.folder;
  const file = `sc${folder}-workflow.html`;
  const setupRel = `scenarios/${folder}/setup.sh`;
  const setupLine = lineOf(path.join(ROOT, setupRel), 'TESTBENCH_MODE') || 1;
  const payload = payloadSource(folder, tracked);
  const readme = `scenarios/${folder}/README.md`;
  const verifyLine = lineOf(path.join(ROOT, readme), 'curl') || 1;

  return {
    schema_version: 2,
    diagram_type: 'workflow',
    meta: {
      title: `Scenario ${id} ${scenario.title} code path`,
      subtitle: `${clip(scenario.trigger_action, 60)} then ${scenario.mock_endpoint} on localhost`,
      output: `.archify/scenarios/${folder}/workflow/${file}`,
      quality_profile: 'showcase',
      locale: 'en',
      repository: {
        url: 'https://github.com/RAJANAGORI/supply-chain-attack-simulator.git',
        provider: 'github',
        revision: rev,
      },
    },
    lanes: [
      { id: 'learner', label: 'Learner' },
      { id: 'payload', label: 'Payload' },
      { id: 'gate', label: 'TESTBENCH gate' },
      { id: 'collector', label: 'Localhost collector' },
      { id: 'safe', label: 'Safe mode', variant: 'exception' },
    ],
    phases: [
      { id: 'run', label: 'Run the lab', fromCol: 0, toCol: 1 },
      { id: 'gate', label: 'Gate', fromCol: 2, toCol: 3, variant: 'security' },
      { id: 'evidence', label: 'Evidence', fromCol: 4, toCol: 5, variant: 'emphasis' },
    ],
    mainPath: ['start', 'run', 'trigger', 'gate', 'exfil', 'verify'],
    nodes: [
      node({
        id: 'start',
        lane: 'learner',
        col: 0,
        type: 'backend',
        label: 'Collector',
        sublabel: 'localhost mock',
        sources: [source(setupRel, setupLine, 'TESTBENCH_MODE in setup.sh')],
      }),
      node({
        id: 'run',
        lane: 'learner',
        col: 1,
        type: 'frontend',
        label: 'Run lab',
        sublabel: clip(scenario.victim_label.split('(')[0], 22),
        sources: [source(readme, 1, 'scenario README')],
      }),
      node({
        id: 'trigger',
        lane: 'payload',
        col: 2,
        type: 'security',
        label: 'Payload',
        sublabel: clip(scenario.trigger_action, 22),
        sources: payload
          ? [source(payload.path, payload.line, 'TESTBENCH_MODE gate')]
          : [source(setupRel, setupLine, 'lab payload gate')],
      }),
      node({
        id: 'gate',
        lane: 'gate',
        col: 3,
        type: 'security',
        label: 'TESTBENCH',
        sublabel: 'enabled?',
        sources: payload
          ? [source(payload.path, payload.line, 'enabled check')]
          : [source(setupRel, setupLine, 'enabled check')],
      }),
      node({
        id: 'exfil',
        lane: 'collector',
        col: 4,
        type: 'backend',
        label: 'Exfil',
        sublabel: clip(scenario.mock_endpoint, 22),
        sources: [source(setupRel, setupLine, 'localhost collector')],
      }),
      node({
        id: 'safe',
        lane: 'safe',
        col: 4,
        type: 'external',
        label: 'SAFE MODE',
        sublabel: 'no network',
      }),
      node({
        id: 'verify',
        lane: 'learner',
        col: 5,
        type: 'frontend',
        label: 'Verify',
        sublabel: 'curl capture',
        sources: [source(readme, verifyLine, 'verify command')],
      }),
    ],
    edges: [
      { from: 'start', to: 'run' },
      { from: 'run', to: 'trigger', label: 'load' },
      { from: 'trigger', to: 'gate' },
      { from: 'gate', to: 'exfil', variant: 'security' },
      { from: 'gate', to: 'safe', variant: 'dashed', role: 'error' },
      { from: 'exfil', to: 'verify', label: 'saved' },
    ],
    cards: [
      {
        dot: 'emerald',
        title: 'What the code does',
        items: [
          clip(scenario.trigger_action, 90),
          `Exfil stays on localhost: ${scenario.mock_endpoint}`,
          'The cover behavior still returns so the lab looks normal',
        ],
      },
      {
        dot: 'rose',
        title: 'The gate',
        items: [
          "Malicious network runs only when TESTBENCH_MODE === 'enabled'",
          'Otherwise the payload takes the SAFE MODE branch',
          'Do not point this path at a real host',
        ],
      },
      {
        dot: 'cyan',
        title: 'Evidence',
        items: [
          clip(scenario.verify_cli, 90),
          `Collector: ${clip(scenario.mock_start, 70)}`,
          'Optional Elasticsearch indexing is a later step, not this path',
        ],
      },
    ],
  };
}

function main() {
  const rev = revision();
  if (!/^[a-f0-9]{40}$/.test(rev)) {
    throw new Error(`HEAD is not a 40-char revision: ${rev}`);
  }
  const tracked = trackedFiles();
  for (const scenario of META) {
    const dir = path.join(ROOT, '.archify/scenarios', scenario.folder, 'workflow');
    fs.mkdirSync(dir, { recursive: true });
    const out = path.join(dir, 'candidate.json');
    fs.writeFileSync(out, `${JSON.stringify(candidate(scenario, rev, tracked), null, 2)}\n`);
    process.stdout.write(`wrote ${path.relative(ROOT, out)}\n`);
  }
}

main();
