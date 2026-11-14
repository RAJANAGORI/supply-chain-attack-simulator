import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

// State lives in a temp dir so tests never touch ~/.scas. Repo root is two levels above apps/control-plane.
process.env.SCAS_PROGRESS_PATH = join(mkdtempSync(join(tmpdir(), 'scas-ctf-')), 'progress.json');
process.env.SCAS_REPO_ROOT = resolve(import.meta.dirname, '../../../..');

const { SubmitRejected, getChallenge, setDeadline, submitRule } = await import('./index.js');

const GOOD_SIGMA = `
title: Install of request-lib
logsource: { category: process_creation }
detection:
  selection:
    process.command_line|contains|all: ["npm", "install"]
    process.command_line|contains: "request-lib"
  condition: selection
level: medium
`;

test('lab 01 DETECT.md example Sigma passes with full marks', () => {
  const challenge = getChallenge('01', 'fresh-learner');
  assert.ok(challenge);
  assert.equal(challenge.reference, undefined, 'reference stays hidden before a pass');
  assert.ok(challenge.hints?.semgrep, 'semgrep hint is available before a pass');
  assert.ok(challenge.hints?.sigma, 'sigma hint is available before a pass');
  assert.equal(
    /127\\.0\\.0\\.1[\\s\\S]{0,40}\/collect/.test(challenge.hints?.semgrep ?? ''),
    false,
    'hint must not dump the reference regex',
  );
  const { parseDetectMarkdown } = createRequire(import.meta.url)(
    resolve(process.env.SCAS_REPO_ROOT!, 'detection-tools/es/parse-detect-md.js'),
  ) as { parseDetectMarkdown: (md: string) => { sigma: string } };
  const detectSigma = parseDetectMarkdown(
    readFileSync(resolve(process.env.SCAS_REPO_ROOT!, 'scenarios/01-typosquatting/DETECT.md'), 'utf8'),
  ).sigma;
  const r = submitRule('01', { format: 'sigma', rule: detectSigma, learnerId: 'ref' });
  assert.equal(r.valid, true);
  assert.equal(r.passed, true);
  assert.equal(r.score, 100);
});

test('match-everything rule hits false positives and fails', () => {
  const rule = `
title: too broad
detection:
  selection:
    process.command_line|contains: "npm"
  condition: selection
level: low
`;
  const r = submitRule('01', { format: 'sigma', rule, learnerId: 'broad' });
  assert.equal(r.passed, false);
  assert.equal(r.breakdown?.tp.caught, 3);
  assert.ok((r.breakdown?.benign.clean ?? 0) < (r.breakdown?.benign.total ?? 0));
  assert.ok(r.score < 100 && r.score > 50);
});

test('rule that matches nothing earns no quiet credit', () => {
  const rule = `
title: nothing
detection:
  selection:
    process.command_line|contains: "zzz-never"
  condition: selection
`;
  const r = submitRule('01', { format: 'sigma', rule, learnerId: 'none' });
  assert.equal(r.score, 0);
});

test('bad YAML and bad conditions are reported, not thrown', () => {
  assert.equal(submitRule('01', { format: 'sigma', rule: 'detection: [', learnerId: 'x' }).valid, false);
  const bad = submitRule('01', {
    format: 'sigma',
    rule: 'detection:\n  selection:\n    a: b\n  condition: selection and ghost\n',
    learnerId: 'x',
  });
  assert.equal(bad.valid, false);
  assert.match(bad.errors[0], /ghost/);
});

test('sigma condition operators', () => {
  const rule = `
title: combo
detection:
  sel_npm:
    process.name: npm
  sel_lib:
    process.command_line|contains: request-lib
  filter_git:
    process.name: git
  condition: sel_npm and sel_lib and not filter_git
`;
  const r = submitRule('01', { format: 'sigma', rule, learnerId: 'combo' });
  assert.equal(r.passed, true);
});

test('semgrep regex rule passes, over-broad one does not', () => {
  const good = `
rules:
  - id: beacon
    message: m
    severity: WARNING
    languages: [javascript]
    pattern-regex: "127\\\\.0\\\\.0\\\\.1[\\\\s\\\\S]{0,40}/collect[\\"'\`]"
`;
  const r = submitRule('01', { format: 'semgrep', rule: good, learnerId: 'sg' });
  assert.equal(r.passed, true, JSON.stringify(r.cases));

  const broad = 'rules:\n  - id: b\n    message: m\n    severity: INFO\n    languages: [javascript]\n    pattern: process.env.$X\n';
  const b = submitRule('01', { format: 'semgrep', rule: broad, learnerId: 'sg2' });
  assert.equal(b.passed, false);
});

test('semgrep pattern with ellipsis and metavariable', () => {
  const rule = 'rules:\n  - id: f\n    message: m\n    severity: INFO\n    languages: [javascript]\n    pattern: fetch("http://127.0.0.1:3000/collect", ...)\n';
  const r = submitRule('01', { format: 'semgrep', rule, learnerId: 'sg3' });
  assert.equal(r.breakdown?.tp.caught, 1);
  assert.equal(r.breakdown?.benign.clean, r.breakdown?.benign.total);
});

test('catastrophic regex is cut off, not hung', () => {
  const rule = `rules:\n  - id: r\n    message: m\n    severity: INFO\n    languages: [javascript]\n    pattern-regex: "(a|aa)+$"\n`;
  const started = Date.now();
  const r = submitRule('01', { format: 'semgrep', rule, learnerId: 'redos' });
  assert.ok(Date.now() - started < 5000);
  assert.equal(typeof r.score, 'number');
});

test('deadline and unknown scenario', () => {
  assert.throws(() => submitRule('02', { format: 'sigma', rule: 'x' }), SubmitRejected);
  setDeadline('01', { deadline: new Date(Date.now() - 1000).toISOString() });
  assert.throws(
    () => submitRule('01', { format: 'sigma', rule: GOOD_SIGMA }),
    (e: unknown) => e instanceof SubmitRejected && e.status === 423 && e.reason === 'deadline-passed',
  );
  const c = getChallenge('01');
  assert.equal(c?.locked, 'deadline-passed');
  assert.ok(c?.reference?.sigma, 'reference reveals once locked');
  setDeadline('01', {});
  assert.equal(getChallenge('01')?.locked, null);
});
