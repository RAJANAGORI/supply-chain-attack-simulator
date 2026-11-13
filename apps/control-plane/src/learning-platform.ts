import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { SCENARIOS } from './registry/scenarios.js';
import { loadLesson } from './registry/lesson-loader.js';
import { readProgress } from './progress.js';
import { isLessonComplete } from './lesson-progress.js';
import { getCampaign, type CampaignInject } from './registry/campaigns.js';
import { CLASSROOM_ROLES, type ClassroomRole } from './registry/lesson-types.js';

export { CLASSROOM_ROLES, type ClassroomRole };

export function scasDir(): string {
  return process.env.SCAS_PROGRESS_PATH
    ? dirname(resolve(process.env.SCAS_PROGRESS_PATH))
    : resolve(homedir(), '.scas');
}

export interface SkillCategory {
  category: string;
  label: string;
  total: number;
  completed: number;
  scenarioIds: string[];
  completedIds: string[];
}

/** ATT&CK technique coverage across guided labs (only labs that declare `attck`). */
export interface SkillTechnique {
  id: string;
  labIds: string[];
  completedIds: string[];
  /** NIST SP 800 / practice refs that appear on labs tagged with this technique. */
  nist?: string[];
  /** Broader MITRE context / matrix refs from labs tagged with this technique. */
  mitre?: string[];
}

/** Minimal adaptive tip: the next lab that shares tags with, or builds on, what you finished. */
export interface NextLabSuggestion {
  id: string;
  title: string;
  reason: string;
}

export interface SkillMatrix {
  categories: SkillCategory[];
  techniques: SkillTechnique[];
  nextLab: NextLabSuggestion | null;
  completedLabs: number;
  totalLabs: number;
  exportedAt: string;
}

/** Pure ranking so the tip is easy to reason about: prereq link counts 2, each shared technique 1. */
export function suggestNextLab(
  labs: Array<{ id: string; title: string; attck: string[]; prereqs: string[]; completed: boolean }>,
): NextLabSuggestion | null {
  const done = labs.filter((l) => l.completed);
  if (done.length === 0) return null;
  const doneIds = new Set(done.map((l) => l.id));
  const doneTechniques = new Set(done.flatMap((l) => l.attck));

  let best: { lab: (typeof labs)[number]; score: number; shared: string[]; via: string[] } | null = null;
  for (const lab of labs) {
    if (lab.completed) continue;
    if (lab.prereqs.some((p) => !doneIds.has(p))) continue;
    const shared = lab.attck.filter((t) => doneTechniques.has(t));
    const via = lab.prereqs.filter((p) => doneIds.has(p));
    const score = shared.length + (via.length ? 2 : 0);
    if (score === 0) continue;
    if (!best || score > best.score || (score === best.score && lab.id < best.lab.id)) {
      best = { lab, score, shared, via };
    }
  }
  if (!best) return null;

  const parts: string[] = [];
  if (best.via.length) parts.push(`builds on lab ${best.via.join(', ')}`);
  if (best.shared.length) parts.push(`shares ${best.shared.join(', ')} with labs you finished`);
  return { id: best.lab.id, title: best.lab.title, reason: parts.join('; ') };
}

export function buildSkillMatrix(): SkillMatrix {
  const progress = readProgress();
  const byCat = new Map<string, { total: string[]; done: string[] }>();

  for (const s of SCENARIOS) {
    const lesson = loadLesson(s);
    if (!lesson) continue;
    const bucket = byCat.get(lesson.category) ?? { total: [], done: [] };
    bucket.total.push(s.id);
    const entry = progress.scenarios[s.id];
    if (isLessonComplete(lesson, entry?.completedSteps)) {
      bucket.done.push(s.id);
    }
    byCat.set(lesson.category, bucket);
  }

  const categories: SkillCategory[] = Array.from(byCat.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, data]) => ({
      category,
      label: category
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      total: data.total.length,
      completed: data.done.length,
      scenarioIds: data.total,
      completedIds: data.done,
    }));

  const withLessons = SCENARIOS.filter((s) => loadLesson(s));
  const completedLabs = withLessons.filter((s) => {
    const lesson = loadLesson(s)!;
    const entry = progress.scenarios[s.id];
    return isLessonComplete(lesson, entry?.completedSteps);
  }).length;

  const techById = new Map<string, { id: string; labIds: string[]; completedIds: string[]; nist: Set<string>; mitre: Set<string> }>();
  const tagged: Array<{ id: string; title: string; attck: string[]; prereqs: string[]; completed: boolean }> = [];
  for (const s of withLessons) {
    const lesson = loadLesson(s)!;
    const entry = progress.scenarios[s.id];
    const completed = isLessonComplete(lesson, entry?.completedSteps);
    tagged.push({
      id: s.id,
      title: s.title,
      attck: lesson.attck ?? [],
      prereqs: lesson.prereqs ?? [],
      completed,
    });
    for (const t of lesson.attck ?? []) {
      const entry = techById.get(t) ?? { id: t, labIds: [], completedIds: [], nist: new Set(), mitre: new Set() };
      entry.labIds.push(s.id);
      if (completed) entry.completedIds.push(s.id);
      if (lesson.nist) lesson.nist.forEach((n) => entry.nist.add(n));
      if (lesson.mitre) lesson.mitre.forEach((m) => entry.mitre.add(m));
      techById.set(t, entry);
    }
  }
  const techniques: SkillTechnique[] = Array.from(techById.values())
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((t) => ({ id: t.id, labIds: t.labIds, completedIds: t.completedIds, nist: t.nist.size ? [...t.nist] : undefined, mitre: t.mitre.size ? [...t.mitre] : undefined }));

  return {
    categories,
    techniques,
    nextLab: suggestNextLab(tagged),
    completedLabs,
    totalLabs: withLessons.length,
    exportedAt: new Date().toISOString(),
  };
}

export function skillMatrixMarkdown(): string {
  const matrix = buildSkillMatrix();
  const lines = [
    '# SCAS skill matrix',
    '',
    `Exported: ${matrix.exportedAt}`,
    `Labs complete: ${matrix.completedLabs}/${matrix.totalLabs}`,
    '',
    '| Category | Done | Total | Labs |',
    '|---|---:|---:|---|',
  ];
  for (const c of matrix.categories) {
    const mark = c.completedIds.length ? c.completedIds.join(', ') : '-';
    lines.push(`| ${c.label} | ${c.completed} | ${c.total} | ${mark} |`);
  }
  lines.push('');
  if (matrix.techniques.length) {
    lines.push('| ATT&CK technique | NIST | MITRE | Done | Labs |', '|---|---|---:|---|---|');
    for (const t of matrix.techniques) {
      const nistStr = t.nist?.join(', ') || '-';
      const mitreStr = t.mitre?.join(', ') || '-';
      lines.push(`| ${t.id} | ${nistStr} | ${mitreStr} | ${t.completedIds.length}/${t.labIds.length} | ${t.labIds.join(', ')} |`);
    }
    lines.push('');
  }
  if (matrix.nextLab) {
    lines.push(`Suggested next lab: ${matrix.nextLab.id} (${matrix.nextLab.title}) - ${matrix.nextLab.reason}`, '');
  }
  return lines.join('\n');
}

export interface ClassroomStudent {
  id: string;
  name: string;
  joinedAt: string;
  lastScenarioId?: string;
  lastStepId?: string;
  completedSteps: number;
  /** Assessment points at last report, for the leaderboard. */
  points?: number;
  frozen?: boolean;
  /** Tabletop role picked at join time. Drives which decisions the learner owns. */
  role?: ClassroomRole;
}

/** Shared tabletop clock. Everyone in the room sees the same T+ minute and released injects. */
export interface ClassroomClock {
  /** How many injects the instructor has released so far. */
  tick: number;
  /** Simulated minutes since the exercise started (T+). */
  minute: number;
  /** Campaign whose injects this clock releases, set on the first tick. */
  campaignId?: string;
  releasedInjectIds: string[];
  updatedAt: string;
}

export interface ClassroomState {
  code: string;
  title: string;
  createdAt: string;
  frozen: boolean;
  students: ClassroomStudent[];
  clock: ClassroomClock;
}

function classroomPath(): string {
  return resolve(scasDir(), 'classroom.json');
}

function emptyClock(): ClassroomClock {
  return { tick: 0, minute: 0, releasedInjectIds: [], updatedAt: new Date().toISOString() };
}

function emptyClassroom(): ClassroomState {
  return {
    code: '',
    title: '',
    createdAt: new Date().toISOString(),
    frozen: false,
    students: [],
    clock: emptyClock(),
  };
}

export function readClassroom(): ClassroomState {
  const path = classroomPath();
  if (!existsSync(path)) return emptyClassroom();
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<ClassroomState>;
    // Sessions saved before roles and the clock existed still load.
    return { ...emptyClassroom(), ...parsed, clock: parsed.clock ?? emptyClock() } as ClassroomState;
  } catch {
    return emptyClassroom();
  }
}

function writeClassroom(state: ClassroomState): ClassroomState {
  mkdirSync(scasDir(), { recursive: true });
  writeFileSync(classroomPath(), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  return state;
}

export function createClassroom(title = 'SCAS classroom'): ClassroomState {
  const code = randomBytes(3).toString('hex').toUpperCase();
  return writeClassroom({
    code,
    title,
    createdAt: new Date().toISOString(),
    frozen: false,
    students: [],
    clock: emptyClock(),
  });
}

export function setClassroomFrozen(frozen: boolean): ClassroomState {
  const current = readClassroom();
  if (!current.code) throw new Error('No classroom session. Create one first.');
  return writeClassroom({ ...current, frozen });
}

export function parseClassroomRole(raw: unknown): ClassroomRole | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const match = CLASSROOM_ROLES.find((r) => r.toLowerCase() === String(raw).trim().toLowerCase());
  if (!match) throw new Error(`Role must be one of ${CLASSROOM_ROLES.join(', ')}`);
  return match;
}

export function joinClassroom(code: string, name: string, roleRaw?: unknown): ClassroomState {
  const current = readClassroom();
  if (!current.code || current.code.toUpperCase() !== code.toUpperCase()) {
    throw new Error('Invalid classroom code');
  }
  if (current.frozen) throw new Error('Classroom is frozen for debrief');
  const role = parseClassroomRole(roleRaw);
  const clean = name.trim().slice(0, 64) || 'Learner';
  const existing = current.students.find((s) => s.name.toLowerCase() === clean.toLowerCase());
  if (existing) {
    // Rejoining with the same name lets a learner switch seats.
    if (!role || existing.role === role) return current;
    return writeClassroom({
      ...current,
      students: current.students.map((s) => (s.id === existing.id ? { ...s, role } : s)),
    });
  }
  const student: ClassroomStudent = {
    id: randomBytes(4).toString('hex'),
    name: clean,
    joinedAt: new Date().toISOString(),
    completedSteps: 0,
    ...(role ? { role } : {}),
  };
  return writeClassroom({ ...current, students: [...current.students, student] });
}

export function reportClassroomProgress(
  studentId: string,
  patch: { lastScenarioId?: string; lastStepId?: string; completedSteps?: number; points?: number },
): ClassroomState {
  const current = readClassroom();
  if (!current.code) throw new Error('No classroom');
  if (current.frozen) throw new Error('Classroom is frozen');
  const students = current.students.map((s) =>
    s.id === studentId
      ? {
          ...s,
          lastScenarioId: patch.lastScenarioId ?? s.lastScenarioId,
          lastStepId: patch.lastStepId ?? s.lastStepId,
          completedSteps: patch.completedSteps ?? s.completedSteps,
          points: patch.points ?? s.points,
        }
      : s,
  );
  return writeClassroom({ ...current, students });
}

/** Clear per-student lab progress; keep classroom code and roster for the session. */
export function resetClassroomLearnerProgress(): ClassroomState {
  const current = readClassroom();
  if (!current.code) return current;
  const students = current.students.map((s) => ({
    ...s,
    lastScenarioId: undefined,
    lastStepId: undefined,
    completedSteps: 0,
  }));
  return writeClassroom({ ...current, students, frozen: false, clock: emptyClock() });
}

const DEFAULT_TICK_MINUTES = 5;

/**
 * Instructor tick for the shared tabletop clock.
 * With a campaignId it releases the next campaign inject (file order) and jumps to
 * that inject's `tMinute` when set, else adds `minutes`. Without one it only moves the clock.
 * `reset` puts the clock back to T+0.
 */
export function tickClassroomClock(opts: {
  campaignId?: string;
  minutes?: number;
  reset?: boolean;
}): ClassroomState {
  const current = readClassroom();
  if (!current.code) throw new Error('No classroom session. Create one first.');
  if (opts.reset) return writeClassroom({ ...current, clock: emptyClock() });

  const clock = current.clock ?? emptyClock();
  const campaignId = opts.campaignId || clock.campaignId;
  const step =
    Number.isFinite(opts.minutes) && (opts.minutes as number) > 0
      ? Math.floor(opts.minutes as number)
      : DEFAULT_TICK_MINUTES;

  let minute = clock.minute + step;
  let tick = clock.tick;
  let released = clock.releasedInjectIds;
  if (campaignId) {
    const campaign = getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    const next = (campaign.injects ?? []).find((inj) => !released.includes(inj.id));
    if (next) {
      released = [...released, next.id];
      tick = released.length;
      if (typeof next.tMinute === 'number' && next.tMinute >= 0) {
        minute = Math.max(clock.minute, next.tMinute);
      }
    }
  }
  return writeClassroom({
    ...current,
    clock: { tick, minute, campaignId, releasedInjectIds: released, updatedAt: new Date().toISOString() },
  });
}

/** Injects the instructor has released so far, for the classroom and campaign pages. */
export function readClassroomInjects(): { clock: ClassroomClock; injects: CampaignInject[] } {
  const { clock } = readClassroom();
  const campaign = clock.campaignId ? getCampaign(clock.campaignId) : undefined;
  const injects = (campaign?.injects ?? []).filter((inj) => clock.releasedInjectIds.includes(inj.id));
  return { clock, injects };
}

export function buildBriefing(scenarioId?: string): {
  generatedAt: string;
  labs: Array<{
    id: string;
    title: string;
    category: string;
    completed: boolean;
    completedSteps: string[];
    objectives: string[];
    incidents: string[];
    attck: string[];
    nist: string[];
    prereqs: string[];
    remediates: string[];
  }>;
  skills: ReturnType<typeof buildSkillMatrix>;
} {
  const progress = readProgress();
  const labs = SCENARIOS.filter((s) => !scenarioId || s.id === scenarioId)
    .map((s) => {
      const lesson = loadLesson(s);
      if (!lesson) return null;
      const entry = progress.scenarios[s.id];
      const completedSteps = entry?.completedSteps ?? [];
      return {
        id: s.id,
        title: s.title,
        category: lesson.category,
        completed: isLessonComplete(lesson, completedSteps),
        completedSteps,
        objectives: lesson.objectives,
        incidents: lesson.incidents,
        attck: lesson.attck ?? [],
        nist: lesson.nist ?? [],
        prereqs: lesson.prereqs ?? [],
        remediates: lesson.remediates ?? [],
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    generatedAt: new Date().toISOString(),
    labs,
    skills: buildSkillMatrix(),
  };
}

export async function fetchEsTimeline(limit = 50): Promise<{
  ok: boolean;
  url: string;
  events: Array<Record<string, unknown>>;
  error?: string;
}> {
  const host = process.env.SCAS_PLATFORM_HOST || '127.0.0.1';
  const base = process.env.SCAS_ES_URL || `http://${host}:9200`;
  const index = process.env.SCAS_ES_INDEX || 'scas-detections';
  try {
    const res = await fetch(`${base}/${index}/_search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        size: Math.min(Math.max(limit, 1), 200),
        sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }, { _doc: 'desc' }],
        query: { match_all: {} },
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, url: base, events: [], error: text.slice(0, 300) };
    }
    const body = (await res.json()) as {
      hits?: { hits?: Array<{ _source?: Record<string, unknown>; _id?: string }> };
    };
    const events = (body.hits?.hits ?? []).map((h) => ({
      id: h._id,
      ...(h._source ?? {}),
    }));
    return { ok: true, url: base, events };
  } catch (err) {
    return {
      ok: false,
      url: base,
      events: [],
      error: err instanceof Error ? err.message : 'Elasticsearch unreachable',
    };
  }
}

export async function askLabAssistant(input: {
  question: string;
  scenarioId?: string;
  stepId?: string;
}): Promise<{ answer: string; provider: string; offline?: boolean }> {
  const question = input.question.trim().slice(0, 2000);
  if (!question) throw new Error('question required');

  const scenario = input.scenarioId ? SCENARIOS.find((s) => s.id === input.scenarioId) : undefined;
  const lesson = scenario ? loadLesson(scenario) : null;
  const step = lesson?.steps.find((s) => s.id === input.stepId);

  const context = [
    scenario ? `Lab ${scenario.id}: ${scenario.title}` : 'No lab selected',
    lesson ? `Category: ${lesson.category}` : '',
    step ? `Step: ${step.title}` : '',
    step ? `Teaching: ${step.teaching}` : '',
    step?.hint ? `Hint: ${step.hint}` : '',
    lesson?.incidents?.length ? `Incidents: ${lesson.incidents.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const apiUrl = process.env.SCAS_AI_URL;
  const apiKey = process.env.SCAS_AI_API_KEY;
  const model = process.env.SCAS_AI_MODEL || 'gpt-4o-mini';

  if (!apiUrl || !apiKey) {
    const answer = [
      'Offline helper (set SCAS_AI_URL and SCAS_AI_API_KEY for a live model).',
      '',
      context || 'Open a guided lab step for richer context.',
      '',
      step
        ? `For this step: ${step.teaching}${step.hint ? ` Hint: ${step.hint}` : ''}`
        : 'Ask again from a lab step, or read DETECT.md in the scenario folder.',
      '',
      `Your question was: ${question}`,
    ].join('\n');
    return { answer, provider: 'offline-context', offline: true };
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a lab coach for the Supply Chain Attack Simulator. Stay educational. Never suggest real external C2, real credentials theft against production, or disabling TESTBENCH_MODE. Prefer localhost lab facts from the provided context.',
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nQuestion: ${question}`,
        },
      ],
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI provider error: ${text.slice(0, 400)}`);
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const answer = body.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error('Empty AI response');
  return { answer, provider: model };
}
