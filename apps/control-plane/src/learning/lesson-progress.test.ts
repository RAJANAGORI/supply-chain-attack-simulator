import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LessonDefinition } from '../registry/lesson-types.js';
import {
  isLessonComplete,
  requiredStepCount,
  summarizeLessonProgress,
} from './lesson-progress.js';

function lesson(partial: Partial<LessonDefinition> & Pick<LessonDefinition, 'steps'>): LessonDefinition {
  return {
    id: '05',
    etaMinutes: 30,
    category: 'ci-cd',
    incidents: [],
    objectives: [],
    mitigation: [],
    ...partial,
  };
}

const branched = lesson({
  steps: [
    { id: 'setup', registry: 'setup', audience: 'both', title: 'Setup', teaching: '', verify: { type: 'exit-zero' } },
    { id: 'services', registry: 'services', audience: 'both', title: 'Services', teaching: '', verify: { type: 'service-listening' } },
    { id: 'run-ci', registry: 'run-ci', audience: 'attack', title: 'Run', teaching: '', verify: { type: 'capture-count', min: 1 } },
    { id: 'detect', registry: null, audience: 'detect', title: 'Detect', teaching: '', verify: { type: 'capture-count', min: 1 } },
    { id: 'detect-late', registry: null, audience: 'detect', title: 'Late', teaching: '', verify: { type: 'capture-count', min: 1 } },
  ],
  decisions: [
    {
      id: 'fork',
      afterStep: 'run-ci',
      prompt: 'What now?',
      choices: [
        { id: 'fast', label: 'Contain', effects: { goto: 'detect', score: 3 } },
        { id: 'slow', label: 'Ship', effects: { goto: 'detect-late', score: -2 } },
      ],
    },
  ],
});

const linear = lesson({
  steps: [
    { id: 'setup', registry: 'setup', audience: 'both', title: 'Setup', teaching: '', verify: { type: 'exit-zero' } },
    { id: 'run', registry: 'run', audience: 'attack', title: 'Run', teaching: '', verify: { type: 'capture-count', min: 1 } },
    { id: 'detect', registry: null, audience: 'detect', title: 'Detect', teaching: '', verify: { type: 'capture-count', min: 1 } },
  ],
  decisions: [
    {
      id: 'one-goto',
      afterStep: 'run',
      prompt: 'Block?',
      choices: [
        { id: 'block', label: 'Block', effects: { goto: 'detect', score: 3 } },
        { id: 'approve', label: 'Approve', effects: { score: -2 } },
      ],
    },
  ],
});

test('branched lab requires spine plus one exclusive step', () => {
  assert.equal(requiredStepCount(branched), 4);
  assert.equal(isLessonComplete(branched, ['setup', 'services', 'run-ci', 'detect']), true);
  assert.equal(isLessonComplete(branched, ['setup', 'services', 'run-ci', 'detect-late']), true);
  assert.equal(isLessonComplete(branched, ['setup', 'services', 'run-ci']), false);
  assert.equal(isLessonComplete(branched, ['setup', 'services', 'run-ci', 'detect', 'detect-late']), true);
});

test('progress summary caps exclusive branches at one', () => {
  const mid = summarizeLessonProgress(branched, ['setup', 'services', 'run-ci']);
  assert.deepEqual(mid, { done: 3, need: 4, complete: false });
  const done = summarizeLessonProgress(branched, ['setup', 'services', 'run-ci', 'detect']);
  assert.deepEqual(done, { done: 4, need: 4, complete: true });
});

test('single goto does not create an exclusive group', () => {
  assert.equal(requiredStepCount(linear), 3);
  assert.equal(isLessonComplete(linear, ['setup', 'run', 'detect']), true);
  assert.equal(isLessonComplete(linear, ['setup', 'run']), false);
});
