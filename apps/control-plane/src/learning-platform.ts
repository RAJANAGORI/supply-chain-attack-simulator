import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { SCENARIOS } from './registry/scenarios.js';
import { loadLesson } from './registry/lesson-loader.js';
import { readProgress } from './progress.js';

function scasDir(): string {
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

export function buildSkillMatrix(): {
  categories: SkillCategory[];
  completedLabs: number;
  totalLabs: number;
  exportedAt: string;
} {
  const progress = readProgress();
  const byCat = new Map<string, { total: string[]; done: string[] }>();

  for (const s of SCENARIOS) {
    const lesson = loadLesson(s);
    if (!lesson) continue;
    const bucket = byCat.get(lesson.category) ?? { total: [], done: [] };
    bucket.total.push(s.id);
    const entry = progress.scenarios[s.id];
    const need = lesson.steps.length;
    if (need > 0 && (entry?.completedSteps?.length ?? 0) >= need) {
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
    return lesson.steps.length > 0 && (entry?.completedSteps?.length ?? 0) >= lesson.steps.length;
  }).length;

  return {
    categories,
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
  return lines.join('\n');
}

export interface ClassroomStudent {
  id: string;
  name: string;
  joinedAt: string;
  lastScenarioId?: string;
  lastStepId?: string;
  completedSteps: number;
  frozen?: boolean;
}

export interface ClassroomState {
  code: string;
  title: string;
  createdAt: string;
  frozen: boolean;
  students: ClassroomStudent[];
}

function classroomPath(): string {
  return resolve(scasDir(), 'classroom.json');
}

function emptyClassroom(): ClassroomState {
  return {
    code: '',
    title: '',
    createdAt: new Date().toISOString(),
    frozen: false,
    students: [],
  };
}

export function readClassroom(): ClassroomState {
  const path = classroomPath();
  if (!existsSync(path)) return emptyClassroom();
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ClassroomState;
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
  });
}

export function setClassroomFrozen(frozen: boolean): ClassroomState {
  const current = readClassroom();
  if (!current.code) throw new Error('No classroom session. Create one first.');
  return writeClassroom({ ...current, frozen });
}

export function joinClassroom(code: string, name: string): ClassroomState {
  const current = readClassroom();
  if (!current.code || current.code.toUpperCase() !== code.toUpperCase()) {
    throw new Error('Invalid classroom code');
  }
  if (current.frozen) throw new Error('Classroom is frozen for debrief');
  const clean = name.trim().slice(0, 64) || 'Learner';
  const existing = current.students.find((s) => s.name.toLowerCase() === clean.toLowerCase());
  if (existing) return current;
  const student: ClassroomStudent = {
    id: randomBytes(4).toString('hex'),
    name: clean,
    joinedAt: new Date().toISOString(),
    completedSteps: 0,
  };
  return writeClassroom({ ...current, students: [...current.students, student] });
}

export function reportClassroomProgress(
  studentId: string,
  patch: { lastScenarioId?: string; lastStepId?: string; completedSteps?: number },
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
  return writeClassroom({ ...current, students, frozen: false });
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
        completed: completedSteps.length >= lesson.steps.length && lesson.steps.length > 0,
        completedSteps,
        objectives: lesson.objectives,
        incidents: lesson.incidents,
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
