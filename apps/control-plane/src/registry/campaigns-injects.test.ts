import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveInjects, type CampaignDefinition } from './campaigns.js';

const quietCarrierLike: CampaignDefinition = {
  id: 'operation-quiet-carrier',
  title: 'Quiet Carrier',
  persona: 'NORTHRELAY',
  tagline: 'test',
  description: 'test',
  debrief: 'test',
  chapters: [
    { scenario: '01', beat: 'Initial access', narrative: 'a' },
    { scenario: '05', beat: 'Build compromise', narrative: 'b' },
    { scenario: '25', beat: 'Trusted-action takeover', narrative: 'c' },
    { scenario: '11', beat: 'Persistence', narrative: 'd' },
  ],
  injects: [
    {
      id: 'inject-01',
      when: 'chapter:01',
      kind: 'intel-brief',
      timestamp: '2026-01-01T00:00:00Z',
      from: 'ti',
      subject: 'one',
      body: 'x',
      confidence: 0.5,
    },
    {
      id: 'inject-05',
      when: 'chapter:05',
      kind: 'alert',
      timestamp: '2026-01-01T00:00:00Z',
      from: 'ti',
      subject: 'five',
      body: 'x',
      confidence: 0.5,
    },
    {
      id: 'inject-11',
      when: 'chapter:11',
      kind: 'alert',
      timestamp: '2026-01-01T00:00:00Z',
      from: 'ti',
      subject: 'eleven',
      body: 'x',
      confidence: 0.5,
    },
    {
      id: 'inject-idx',
      when: 'chapter:3',
      kind: 'intel-brief',
      timestamp: '2026-01-01T00:00:00Z',
      from: 'ti',
      subject: 'third-by-index',
      body: 'x',
      confidence: 0.5,
    },
  ],
};

test('chapter:NN matches scenario ids when present in the campaign', () => {
  const after01 = resolveInjects(quietCarrierLike, ['01']).map((i) => i.id);
  assert.deepEqual(after01, ['inject-01']);

  const after05 = resolveInjects(quietCarrierLike, ['01', '05']).map((i) => i.id);
  assert.ok(after05.includes('inject-01'));
  assert.ok(after05.includes('inject-05'));
  assert.equal(after05.includes('inject-11'), false);

  const after11 = resolveInjects(quietCarrierLike, ['01', '05', '11']).map((i) => i.id);
  assert.ok(after11.includes('inject-11'));
});

test('chapter:N falls back to 1-based index when no scenario id matches', () => {
  const ids = resolveInjects(quietCarrierLike, ['25']).map((i) => i.id);
  assert.deepEqual(ids, ['inject-idx']);
});
