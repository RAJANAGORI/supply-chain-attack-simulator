import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { getRepoRoot } from '../labs/env.js';
import { readClassroom, scasDir } from '../learning/learning-platform.js';
import { SCENARIOS, getScenario } from '../registry/scenarios.js';
import { RegexRejected } from './safe-regex.js';
import { parseSemgrep, semgrepMatches } from './semgrep-eval.js';
import { parseSigma, sigmaMatches, type SigmaEvent } from './sigma-eval.js';

/**
 * Phase 5 MVP: learners submit a Sigma or Semgrep rule, we score it against the
 * fixtures in scenarios/<slug>/ctf-fixtures.json. Everything is evaluated in
 * process against bundled text. No rule ever runs against a live network, a
 * real log pipeline, or the semgrep binary.
 */

export type RuleFormat = 'sigma' | 'semgrep';
export type CaseKind = 'tp' | 'benign';

interface FixtureCase {
  id: string;
  kind: CaseKind;
  label: string;
  event?: SigmaEvent;
  code?: string;
}

interface FormatFixtures {
  starter: string;
  cases: FixtureCase[];
  /** Optional nudge shown on demand. Not the full answer (that stays in `reference`). */
  hint?: string;
}

interface Fixtures {
  scenario_id: string;
  title: string;
  brief: string;
  expected_indicators: string[][];
  sigma?: FormatFixtures;
  semgrep?: FormatFixtures;
  reference?: { sigma?: string; semgrep?: string };
}

export const POINTS = { tp: 50, benign: 35, indicators: 15 } as const;
export const MAX_SCORE = POINTS.tp + POINTS.benign + POINTS.indicators;
const MAX_STORED_SUBMISSIONS = 500;

/* ---- fixtures ---- */

const require = createRequire(import.meta.url);

function loadFixtures(scenarioId: string): { fixtures: Fixtures; slug: string } | null {
  const scenario = getScenario(scenarioId);
  if (!scenario) return null;
  const file = resolve(getRepoRoot(), 'scenarios', scenario.slug, 'ctf-fixtures.json');
  if (!existsSync(file)) return null;
  try {
    return { fixtures: JSON.parse(readFileSync(file, 'utf8')) as Fixtures, slug: scenario.slug };
  } catch {
    return null;
  }
}

/** Reuse the DETECT.md parser the ES loader uses; only for display material. */
function readDetect(scenarioId: string): { sigma: string; sampleLog?: Record<string, unknown>; iocs: string[] } | null {
  const scenario = getScenario(scenarioId);
  if (!scenario) return null;
  const file = resolve(getRepoRoot(), scenario.docs.detect);
  if (!existsSync(file)) return null;
  try {
    const { parseDetectMarkdown } = require(resolve(getRepoRoot(), 'detection-tools/es/parse-detect-md.js')) as {
      parseDetectMarkdown: (md: string, src?: string) => { sigma: string; sample_logs: Record<string, unknown>[]; iocs: string[] };
    };
    const parsed = parseDetectMarkdown(readFileSync(file, 'utf8'), scenario.docs.detect);
    return { sigma: parsed.sigma, sampleLog: parsed.sample_logs[0], iocs: parsed.iocs };
  } catch {
    return null;
  }
}

export function listChallenges(): Array<{ scenarioId: string; title: string; formats: RuleFormat[] }> {
  const out: Array<{ scenarioId: string; title: string; formats: RuleFormat[] }> = [];
  for (const s of SCENARIOS) {
    const loaded = loadFixtures(s.id);
    if (!loaded) continue;
    const formats: RuleFormat[] = [];
    if (loaded.fixtures.sigma) formats.push('sigma');
    if (loaded.fixtures.semgrep) formats.push('semgrep');
    out.push({ scenarioId: s.id, title: loaded.fixtures.title, formats });
  }
  return out;
}

/* ---- state (deadlines + submissions) ---- */

interface Submission {
  scenarioId: string;
  learnerId: string;
  learnerName: string;
  format: RuleFormat;
  score: number;
  passed: boolean;
  attempt: number;
  at: string;
}

interface CtfState {
  deadlines: Record<string, string>;
  submissions: Submission[];
}

function statePath(): string {
  return resolve(scasDir(), 'ctf.json');
}

function readState(): CtfState {
  const path = statePath();
  if (!existsSync(path)) return { deadlines: {}, submissions: [] };
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<CtfState>;
    return {
      deadlines: raw.deadlines && typeof raw.deadlines === 'object' ? raw.deadlines : {},
      submissions: Array.isArray(raw.submissions) ? raw.submissions : [],
    };
  } catch {
    return { deadlines: {}, submissions: [] };
  }
}

function writeState(state: CtfState): void {
  mkdirSync(scasDir(), { recursive: true });
  writeFileSync(statePath(), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

/** Timed mode: a per-lab deadline. Pass minutes to start a timer, or null to clear it. */
export function setDeadline(scenarioId: string, input: { minutes?: number; deadline?: string | null }): string | null {
  const state = readState();
  let iso: string | null = null;
  if (typeof input.minutes === 'number' && Number.isFinite(input.minutes) && input.minutes > 0) {
    iso = new Date(Date.now() + Math.min(input.minutes, 24 * 60) * 60_000).toISOString();
  } else if (typeof input.deadline === 'string') {
    const t = Date.parse(input.deadline);
    if (Number.isNaN(t)) throw new Error('deadline must be an ISO timestamp');
    iso = new Date(t).toISOString();
  }
  if (iso) state.deadlines[scenarioId] = iso;
  else delete state.deadlines[scenarioId];
  writeState(state);
  return iso;
}

export type LockReason = 'classroom-frozen' | 'deadline-passed';

function lockReason(scenarioId: string, state: CtfState): LockReason | null {
  const room = readClassroom();
  if (room.code && room.frozen) return 'classroom-frozen';
  const deadline = state.deadlines[scenarioId];
  if (deadline && Date.now() > Date.parse(deadline)) return 'deadline-passed';
  return null;
}

function board(scenarioId: string, state: CtfState) {
  const best = new Map<string, Submission & { attempts: number }>();
  for (const s of state.submissions) {
    if (s.scenarioId !== scenarioId) continue;
    const prev = best.get(s.learnerId);
    const attempts = (prev?.attempts ?? 0) + 1;
    if (!prev || s.score > prev.score) best.set(s.learnerId, { ...s, attempts });
    else best.set(s.learnerId, { ...prev, attempts });
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.at.localeCompare(b.at))
    .slice(0, 10)
    .map((s) => ({ name: s.learnerName, score: s.score, passed: s.passed, format: s.format, attempts: s.attempts, at: s.at }));
}

function resolveLearner(learnerId?: string): { id: string; name: string } {
  const id = (learnerId ?? '').trim().slice(0, 32);
  if (!id) return { id: 'local', name: 'Local learner' };
  const student = readClassroom().students.find((s) => s.id === id);
  return { id, name: student?.name ?? `Learner ${id.slice(0, 6)}` };
}

/* ---- challenge detail ---- */

export function getChallenge(scenarioId: string, learnerId?: string) {
  const loaded = loadFixtures(scenarioId);
  if (!loaded) return null;
  const { fixtures } = loaded;
  const state = readState();
  const lock = lockReason(scenarioId, state);
  const detect = readDetect(scenarioId);
  const learner = resolveLearner(learnerId);
  const mine = state.submissions.filter((s) => s.scenarioId === scenarioId && s.learnerId === learner.id);
  const revealed = lock !== null || mine.some((s) => s.passed);

  return {
    scenarioId,
    title: fixtures.title,
    brief: fixtures.brief,
    formats: (['sigma', 'semgrep'] as const).filter((f) => fixtures[f]),
    starters: {
      sigma: fixtures.sigma?.starter,
      semgrep: fixtures.semgrep?.starter,
    },
    // Always available: a short nudge per format. Full answers stay in `reference`.
    hints: {
      sigma: fixtures.sigma?.hint,
      semgrep: fixtures.semgrep?.hint,
    },
    // Shown up front: the sample log line from DETECT.md, so the learner sees what the field names look like.
    sampleLog: detect?.sampleLog,
    iocs: detect?.iocs ?? [],
    caseCounts: {
      sigma: caseCounts(fixtures.sigma?.cases),
      semgrep: caseCounts(fixtures.semgrep?.cases),
    },
    scoring: { ...POINTS, max: MAX_SCORE },
    deadline: state.deadlines[scenarioId] ?? null,
    locked: lock,
    best: mine.length ? Math.max(...mine.map((s) => s.score)) : null,
    attempts: mine.length,
    board: board(scenarioId, state),
    // Reference rules stay hidden until the learner passes, the deadline hits, or the room is frozen for debrief.
    reference: revealed
      ? { sigma: detect?.sigma ?? undefined, semgrep: fixtures.reference?.semgrep }
      : undefined,
  };
}

function caseCounts(cases?: FixtureCase[]) {
  return {
    tp: cases?.filter((c) => c.kind === 'tp').length ?? 0,
    benign: cases?.filter((c) => c.kind === 'benign').length ?? 0,
  };
}

/* ---- scoring ---- */

export interface CaseResult {
  id: string;
  kind: CaseKind;
  label: string;
  input: string;
  matched: boolean;
  ok: boolean;
}

export interface SubmitResult {
  ok: boolean;
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
  max: number;
  passed: boolean;
  breakdown?: {
    tp: { caught: number; total: number; points: number; max: number };
    benign: { clean: number; total: number; points: number; max: number };
    indicators: { hit: number; total: number; points: number; max: number };
  };
  cases?: CaseResult[];
  attempt?: number;
}

export class SubmitRejected extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly reason?: LockReason,
  ) {
    super(message);
  }
}

const MAX_RULE_CHARS = 8000;

function indicatorHits(ruleText: string, groups: string[][]): { hit: number; total: number } {
  const text = ruleText.toLowerCase();
  const hit = groups.filter((group) => group.every((token) => text.includes(token.toLowerCase()))).length;
  return { hit, total: groups.length };
}

export function submitRule(
  scenarioId: string,
  input: { format?: string; rule?: string; learnerId?: string },
): SubmitResult {
  const loaded = loadFixtures(scenarioId);
  if (!loaded) throw new SubmitRejected('No rule challenge for this scenario', 404);
  const { fixtures } = loaded;

  const format = input.format as RuleFormat;
  if (format !== 'sigma' && format !== 'semgrep') throw new SubmitRejected('format must be "sigma" or "semgrep"', 400);
  const section = fixtures[format];
  if (!section) throw new SubmitRejected(`This lab has no ${format} fixtures`, 400);
  const ruleText = typeof input.rule === 'string' ? input.rule : '';
  if (ruleText.length > MAX_RULE_CHARS) throw new SubmitRejected(`Rule is longer than ${MAX_RULE_CHARS} characters`, 413);

  const state = readState();
  const lock = lockReason(scenarioId, state);
  if (lock) {
    throw new SubmitRejected(
      lock === 'classroom-frozen' ? 'Classroom is frozen for debrief' : 'The deadline for this challenge has passed',
      423,
      lock,
    );
  }

  const parsed = format === 'sigma' ? parseSigma(ruleText) : parseSemgrep(ruleText);
  if (!parsed.rule) {
    return { ok: true, valid: false, errors: parsed.errors, warnings: parsed.warnings, score: 0, max: MAX_SCORE, passed: false };
  }

  const results: CaseResult[] = [];
  try {
    for (const c of section.cases) {
      const matched =
        format === 'sigma'
          ? sigmaMatches(parsed.rule as Parameters<typeof sigmaMatches>[0], c.event ?? {})
          : semgrepMatches(parsed.rule as Parameters<typeof semgrepMatches>[0], c.code ?? '');
      results.push({
        id: c.id,
        kind: c.kind,
        label: c.label,
        input: format === 'sigma' ? String(c.event?.['process.command_line'] ?? JSON.stringify(c.event)) : String(c.code),
        matched,
        ok: c.kind === 'tp' ? matched : !matched,
      });
    }
  } catch (err) {
    const msg = err instanceof RegexRejected || err instanceof Error ? err.message : 'Rule could not be evaluated';
    return { ok: true, valid: false, errors: [msg], warnings: parsed.warnings, score: 0, max: MAX_SCORE, passed: false };
  }

  const tpTotal = results.filter((r) => r.kind === 'tp').length;
  const tpCaught = results.filter((r) => r.kind === 'tp' && r.matched).length;
  const benignTotal = results.filter((r) => r.kind === 'benign').length;
  const benignClean = results.filter((r) => r.kind === 'benign' && !r.matched).length;

  const tpPoints = tpTotal ? Math.round((tpCaught / tpTotal) * POINTS.tp) : 0;
  // A rule that catches nothing earns no credit for staying quiet.
  const benignPoints = tpCaught === 0 || !benignTotal ? 0 : Math.round((benignClean / benignTotal) * POINTS.benign);
  const ind = indicatorHits(ruleText, fixtures.expected_indicators);
  const indPoints = ind.total && tpCaught > 0 ? Math.round((ind.hit / ind.total) * POINTS.indicators) : 0;

  const score = tpPoints + benignPoints + indPoints;
  const passed = tpCaught === tpTotal && benignClean === benignTotal;

  const learner = resolveLearner(input.learnerId);
  const attempt = state.submissions.filter((s) => s.scenarioId === scenarioId && s.learnerId === learner.id).length + 1;
  state.submissions.push({
    scenarioId,
    learnerId: learner.id,
    learnerName: learner.name,
    format,
    score,
    passed,
    attempt,
    at: new Date().toISOString(),
  });
  if (state.submissions.length > MAX_STORED_SUBMISSIONS) {
    state.submissions = state.submissions.slice(-MAX_STORED_SUBMISSIONS);
  }
  writeState(state);

  return {
    ok: true,
    valid: true,
    errors: [],
    warnings: parsed.warnings,
    score,
    max: MAX_SCORE,
    passed,
    breakdown: {
      tp: { caught: tpCaught, total: tpTotal, points: tpPoints, max: POINTS.tp },
      benign: { clean: benignClean, total: benignTotal, points: benignPoints, max: POINTS.benign },
      indicators: { hit: ind.hit, total: ind.total, points: indPoints, max: POINTS.indicators },
    },
    cases: results,
    attempt,
  };
}
