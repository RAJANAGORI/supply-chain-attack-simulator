import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SCORE_APPROVE_CORRECT,
  SCORE_APPROVE_WRONG,
  SCORE_BLOCK_CORRECT,
  SCORE_BLOCK_WRONG,
  prTriageDecisionId,
  scorePrTriage,
} from './pr-triage.js';

test('blocking the compromise scores highest', () => {
  const r = scorePrTriage(false, 'block');
  assert.equal(r.correct, true);
  assert.equal(r.scoreDelta, SCORE_BLOCK_CORRECT);
  assert.equal(r.choiceId, 'block');
});

test('approving a safe bump is rewarded', () => {
  const r = scorePrTriage(true, 'approve');
  assert.equal(r.correct, true);
  assert.equal(r.scoreDelta, SCORE_APPROVE_CORRECT);
});

test('false positive block is a small penalty', () => {
  const r = scorePrTriage(true, 'block');
  assert.equal(r.correct, false);
  assert.equal(r.scoreDelta, SCORE_BLOCK_WRONG);
});

test('approving the compromise is the worst miss', () => {
  const r = scorePrTriage(false, 'approve');
  assert.equal(r.correct, false);
  assert.equal(r.scoreDelta, SCORE_APPROVE_WRONG);
});

test('decision id is stable for progress merge', () => {
  assert.equal(prTriageDecisionId('bad-1'), 'pr-triage-bad-1');
});
