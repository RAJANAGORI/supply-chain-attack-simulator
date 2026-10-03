#!/usr/bin/env node
'use strict';

// Validate per-scenario lesson.yaml files against the control-plane registry.
// Usage (repo root): node scripts/docs/check-lesson-yaml.js

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCENARIOS_DIR = path.join(ROOT, 'scenarios');
const REGISTRY = path.join(ROOT, 'apps/control-plane/src/registry/scenarios.ts');

const failures = [];
const passes = [];

function ok(msg) {
  passes.push(msg);
  console.log(`PASS: ${msg}`);
}

function fail(msg) {
  failures.push(msg);
  console.error(`FAIL: ${msg}`);
}

function stripQuotes(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseScalar(raw) {
  const t = raw.trim();
  if (t === '' || t === 'null' || t === '~') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^-?\d+$/.test(t)) return Number(t);
  if (/^-?\d+\.\d+$/.test(t)) return Number(t);
  if (t.startsWith('{') && t.endsWith('}')) {
    const inner = t.slice(1, -1).trim();
    if (!inner) return {};
    const obj = {};
    for (const part of inner.split(',')) {
      const eq = part.indexOf(':');
      if (eq < 0) continue;
      obj[part.slice(0, eq).trim()] = parseScalar(part.slice(eq + 1));
    }
    return obj;
  }
  return stripQuotes(t);
}

function parseBlock(lines, start, baseIndent) {
  const first = lines[start];
  if (!first) return { value: null, next: start };

  if (first.trimStart().startsWith('- ')) {
    const list = [];
    let i = start;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim() || line.trim().startsWith('#')) {
        i += 1;
        continue;
      }
      const indent = line.length - line.trimStart().length;
      if (indent < baseIndent) break;
      if (indent > baseIndent) throw new Error(`Unexpected indent at line ${i + 1}`);
      if (!line.trimStart().startsWith('- ')) break;

      const afterDash = line.trimStart().slice(2);
      const keyMatch = afterDash.match(/^([A-Za-z_][\w]*)\s*:/);
      if (keyMatch && !afterDash.trimStart().startsWith('{')) {
        const mapLines = [`${' '.repeat(indent + 2)}${afterDash}`];
        let j = i + 1;
        while (j < lines.length) {
          const next = lines[j];
          if (!next.trim() || next.trim().startsWith('#')) {
            j += 1;
            continue;
          }
          const ni = next.length - next.trimStart().length;
          if (ni <= indent) break;
          if (next.trimStart().startsWith('- ') && ni === indent) break;
          mapLines.push(next);
          j += 1;
        }
        list.push(parseBlock(mapLines, 0, indent + 2).value);
        i = j;
      } else {
        list.push(parseScalar(afterDash));
        i += 1;
      }
    }
    return { value: list, next: i };
  }

  const map = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) {
      i += 1;
      continue;
    }
    const indent = line.length - line.trimStart().length;
    if (indent < baseIndent) break;
    if (indent > baseIndent) throw new Error(`Unexpected indent at line ${i + 1}`);
    if (line.trimStart().startsWith('- ')) break;

    const trimmedLine = line.trimStart();
    const colon = trimmedLine.indexOf(':');
    if (colon < 0) throw new Error(`Expected key: value at line ${i + 1}`);
    const key = trimmedLine.slice(0, colon).trim();
    const rest = trimmedLine.slice(colon + 1).trim();

    if (rest !== '') {
      map[key] = parseScalar(rest);
      i += 1;
      continue;
    }

    let j = i + 1;
    while (j < lines.length && (!lines[j].trim() || lines[j].trim().startsWith('#'))) j += 1;
    if (j >= lines.length) {
      map[key] = null;
      i = j;
      break;
    }
    const childIndent = lines[j].length - lines[j].trimStart().length;
    if (childIndent <= indent) {
      map[key] = null;
      i += 1;
      continue;
    }
    const nested = parseBlock(lines, j, childIndent);
    map[key] = nested.value;
    i = nested.next;
  }
  return { value: map, next: i };
}

function parseLessonYaml(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const { value } = parseBlock(lines, 0, 0);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('lesson.yaml root must be a mapping');
  }
  return value;
}

function normalizeLesson(raw, expectedId) {
  if (String(raw.id) !== expectedId) {
    throw new Error(`lesson id "${raw.id}" does not match scenario id "${expectedId}"`);
  }
  const eta = Number(raw.etaMinutes);
  if (!Number.isFinite(eta) || eta <= 0) throw new Error('etaMinutes must be a positive number');
  if (typeof raw.category !== 'string' || !raw.category) throw new Error('category required');
  if (!Array.isArray(raw.steps) || raw.steps.length === 0) throw new Error('steps must be non-empty');

  const audiences = new Set(['attack', 'detect', 'both']);
  const steps = raw.steps.map((s, i) => {
    if (!s || typeof s !== 'object') throw new Error(`steps[${i}] must be a mapping`);
    if (typeof s.id !== 'string') throw new Error(`steps[${i}].id required`);
    if (!audiences.has(s.audience)) throw new Error(`steps[${i}].audience invalid`);
    if (typeof s.title !== 'string' || typeof s.teaching !== 'string') {
      throw new Error(`steps[${i}] needs title and teaching`);
    }
    const registry = s.registry === undefined ? null : s.registry;
    if (registry !== null && typeof registry !== 'string') {
      throw new Error(`steps[${i}].registry must be string or null`);
    }
    const v = s.verify;
    if (!v || typeof v !== 'object' || !v.type) throw new Error(`steps[${i}].verify required`);
    if (!['exit-zero', 'service-listening', 'capture-count'].includes(v.type)) {
      throw new Error(`steps[${i}].verify.type invalid`);
    }
    if (v.type === 'capture-count' && !(Number(v.min) >= 1)) {
      throw new Error(`steps[${i}].verify.min must be >= 1`);
    }
    return { id: s.id, registry: s.registry === undefined ? null : s.registry };
  });

  // Optional blind drill block.
  if (raw.drill !== undefined && raw.drill !== null) {
    const d = raw.drill;
    if (typeof d !== 'object' || Array.isArray(d)) throw new Error('drill must be a mapping');
    if (typeof d.prompt !== 'string' || !d.prompt.trim()) throw new Error('drill.prompt required');
    if (!['diff', 'package-page', 'ci-log'].includes(d.artifactType)) {
      throw new Error('drill.artifactType must be diff|package-page|ci-log');
    }
    if (!Array.isArray(d.artifact) || d.artifact.length === 0) {
      throw new Error('drill.artifact must be a non-empty list of lines');
    }
    if (!Array.isArray(d.choices) || d.choices.length < 2) {
      throw new Error('drill.choices needs at least two options');
    }
    const ans = Number(d.answer);
    if (!Number.isInteger(ans) || ans < 0 || ans >= d.choices.length) {
      throw new Error('drill.answer must be a valid index into drill.choices');
    }
    if (typeof d.reveal !== 'string' || !d.reveal.trim()) throw new Error('drill.reveal required');
    if (typeof d.explanation !== 'string' || !d.explanation.trim()) {
      throw new Error('drill.explanation required');
    }
  }

  // Optional quiz gate.
  if (raw.quiz !== undefined && raw.quiz !== null) {
    if (!Array.isArray(raw.quiz) || raw.quiz.length === 0) {
      throw new Error('quiz must be a non-empty list of questions');
    }
    raw.quiz.forEach((q, i) => {
      if (!q || typeof q !== 'object' || Array.isArray(q)) throw new Error(`quiz[${i}] must be a mapping`);
      if (typeof q.question !== 'string' || !q.question.trim()) throw new Error(`quiz[${i}].question required`);
      if (!Array.isArray(q.choices) || q.choices.length < 2) throw new Error(`quiz[${i}].choices needs 2+ options`);
      const a = Number(q.answer);
      if (!Number.isInteger(a) || a < 0 || a >= q.choices.length) throw new Error(`quiz[${i}].answer out of range`);
      if (typeof q.explain !== 'string' || !q.explain.trim()) throw new Error(`quiz[${i}].explain required`);
    });
  }

  return { id: String(raw.id), steps };
}

function discoverScenarioDirs() {
  return fs
    .readdirSync(SCENARIOS_DIR)
    .filter((name) => /^\d{2}-/.test(name))
    .filter((name) => fs.statSync(path.join(SCENARIOS_DIR, name)).isDirectory())
    .sort();
}

function extractRegistrySteps(source) {
  const byId = new Map();
  const idBlocks = [];
  let m;
  const baseRe = /baseScenario\(\s*'(\d{2})'/g;
  while ((m = baseRe.exec(source)) !== null) idBlocks.push({ id: m[1], index: m.index });
  const objRe = /\{\s*id:\s*'(\d{2})'/g;
  while ((m = objRe.exec(source)) !== null) idBlocks.push({ id: m[1], index: m.index });
  idBlocks.sort((a, b) => a.index - b.index);

  for (let i = 0; i < idBlocks.length; i++) {
    const start = idBlocks[i].index;
    const end = i + 1 < idBlocks.length ? idBlocks[i + 1].index : source.length;
    const chunk = source.slice(start, end);
    const steps = new Set();
    const stepRe = /(?:victimStep\(\s*'([^']+)'|{\s*id:\s*'([^']+)'\s*,\s*label:)/g;
    let sm;
    while ((sm = stepRe.exec(chunk)) !== null) steps.add(sm[1] || sm[2]);
    byId.set(idBlocks[i].id, steps);
  }
  return byId;
}

function main() {
  const dirs = discoverScenarioDirs();
  const registrySteps = extractRegistrySteps(fs.readFileSync(REGISTRY, 'utf8'));
  let lessonCount = 0;

  for (const dir of dirs) {
    const id = dir.slice(0, 2);
    const lessonPath = path.join(SCENARIOS_DIR, dir, 'lesson.yaml');
    if (!fs.existsSync(lessonPath)) continue;
    lessonCount += 1;

    let lesson;
    try {
      lesson = normalizeLesson(parseLessonYaml(fs.readFileSync(lessonPath, 'utf8')), id);
      ok(`${dir}/lesson.yaml parses (${lesson.steps.length} steps)`);
    } catch (err) {
      fail(`${dir}/lesson.yaml: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    const known = registrySteps.get(id) || new Set();
    for (const step of lesson.steps) {
      if (step.registry === null) continue;
      if (step.registry === 'setup' || step.registry === 'services') continue;
      if (!known.has(step.registry)) {
        fail(
          `${dir}/lesson.yaml step "${step.id}" registry "${step.registry}" missing from scenarios.ts for ${id}`,
        );
      } else {
        ok(`${dir} step ${step.id} -> registry ${step.registry}`);
      }
    }
  }

  if (lessonCount === 0) fail('No lesson.yaml files found under scenarios/');
  else ok(`Found ${lessonCount} lesson.yaml file(s)`);

  for (const dir of dirs) {
    const lessonPath = path.join(SCENARIOS_DIR, dir, 'lesson.yaml');
    if (!fs.existsSync(lessonPath)) fail(`Required ${dir}/lesson.yaml is missing`);
    else ok(`Required ${dir}/lesson.yaml present`);
  }

  console.log('');
  console.log(`${passes.length} passed, ${failures.length} failed`);
  if (failures.length) process.exit(1);
}

main();
