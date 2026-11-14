import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCapture } from './capture-store.js';
import type { ScenarioDefinition } from '../registry/types.js';

const dir = mkdtempSync(join(tmpdir(), 'scas-cap-'));
mkdirSync(join(dir, 'infrastructure'), { recursive: true });
writeFileSync(
  join(dir, 'infrastructure', 'captured-data.json'),
  JSON.stringify({ captures: [{ timestamp: '2026-01-01T00:00:00.000Z', data: { ok: true } }] }),
);

const scenario = {
  id: '05',
  slug: '05-build-compromise',
  title: 't',
  level: 'Advanced',
  ports: [3000],
  setup: { command: './setup.sh', cwd: dir },
  services: [],
  steps: [],
  captures: [
    {
      id: 'capture-3000',
      label: 'Captured data',
      url: 'http://127.0.0.1:3000/captured-data',
      clearUrl: 'http://127.0.0.1:3000/captured-data',
    },
  ],
  docs: { readme: '', detect: '' },
} as ScenarioDefinition;

const payload = await readCapture(scenario, scenario.captures[0]);
assert.ok(payload && typeof payload === 'object');
const obj = payload as { captures?: unknown[] };
assert.equal(Array.isArray(obj.captures), true);
assert.equal(obj.captures?.length, 1);
console.log('capture-store disk fallback ok');
