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

const { CHAINS } = require('./scenario-call-chains');

function candidate(scenario, rev) {
  const id = scenario.scenario_id;
  const chain = CHAINS[id];
  if (!chain) throw new Error(`No call chain for scenario ${id}`);
  const folder = scenario.folder;
  const file = `sc${folder}-workflow.html`;
  const seen = new Set();
  const nodes = chain.nodes.map((node) => {
    const key = `${node.lane}:${node.col}`;
    if (seen.has(key)) throw new Error(`${id} overlaps ${key}`);
    seen.add(key);
    const abs = path.join(ROOT, node.file);
    const line = lineOf(abs, node.needle);
    if (!line) throw new Error(`${id} needle missing in ${node.file}: ${node.needle}`);
    return {
      id: node.id,
      lane: node.lane,
      col: node.col,
      type: node.type,
      label: node.label,
      sublabel: node.sublabel,
      sources: [source(node.file, line, node.about)],
    };
  });
  const ids = new Set(nodes.map((node) => node.id));
  for (const hop of chain.edges) {
    if (!ids.has(hop.from) || !ids.has(hop.to)) {
      throw new Error(`${id} edge ${hop.from}->${hop.to} is not a node`);
    }
  }
  return {
    schema_version: 2,
    diagram_type: 'workflow',
    meta: {
      title: `Scenario ${id} ${scenario.title} calls`,
      subtitle: chain.blurb,
      output: `.archify/scenarios/${folder}/workflow/${file}`,
      quality_profile: 'showcase',
      locale: 'en',
      repository: {
        url: 'https://github.com/RAJANAGORI/supply-chain-attack-simulator.git',
        provider: 'github',
        revision: rev,
      },
    },
    lanes: chain.lanes,
    mainPath: chain.mainPath,
    nodes,
    edges: chain.edges,
    cards: [
      {
        dot: 'emerald',
        title: 'Who calls whom',
        items: chain.notes.map((line) => clip(line.replace(/`/g, ''), 110)),
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
    fs.writeFileSync(out, `${JSON.stringify(candidate(scenario, rev), null, 2)}\n`);
    process.stdout.write(`wrote ${path.relative(ROOT, out)}\n`);
  }
}

main();
