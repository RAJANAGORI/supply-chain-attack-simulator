import { controlPlaneApiBase, controlPlaneWsUrl } from './hosts';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${controlPlaneApiBase()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || res.statusText);
  }
  return res.json() as Promise<T>;
}

export type LessonAudience = 'attack' | 'detect' | 'both';

export type LessonVerify =
  | { type: 'exit-zero' }
  | { type: 'service-listening' }
  | { type: 'capture-count'; min: number };

export interface LessonStep {
  id: string;
  registry: string | null;
  audience: LessonAudience;
  title: string;
  teaching: string;
  hint?: string;
  verify: LessonVerify;
}

export interface LessonDefinition {
  id: string;
  etaMinutes: number;
  category: string;
  incidents: string[];
  objectives: string[];
  caseStudy?: string;
  mitigation?: string[];
  steps: LessonStep[];
}

export interface LessonSummary {
  etaMinutes: number;
  category: string;
  stepCount: number;
}

export interface ScenarioProgressEntry {
  completedSteps: string[];
  hintsOpened: string[];
  currentStepId?: string;
  updatedAt: string;
}

export interface ProgressState {
  lastScenarioId?: string;
  lastStepId?: string;
  scenarios: Record<string, ScenarioProgressEntry>;
  updatedAt: string;
}

export interface ScenarioSummary {
  id: string;
  slug: string;
  title: string;
  level: string;
  ports: number[];
  activeProcesses?: number;
  lesson?: LessonSummary | null;
}

export interface ScenarioDetail extends ScenarioSummary {
  setup: { command: string; cwd: string };
  services: { id: string; label: string; port?: number }[];
  steps: { id: string; label: string }[];
  captures: { id: string; label: string; url: string }[];
  floci?: { seed?: string; verify?: string };
  docs: { readme: string; detect: string };
  processes?: { id: string; label: string; status: string; serviceId?: string; stepId?: string }[];
  lesson?: LessonDefinition | null;
}

export interface PlatformStatus {
  controlPlane: { ok: boolean; port: number };
  elasticsearch: { ok: boolean; url: string };
  kibana: { ok: boolean; url: string };
  floci: { ok: boolean; url: string };
  portConflicts: number[];
}

export interface LogEntry {
  sessionId: string;
  timestamp: string;
  stream: 'stdout' | 'stderr' | 'system';
  line: string;
}

export interface ProcessRecord {
  id: string;
  scenarioId?: string;
  label: string;
  status: 'running' | 'stopped' | 'failed' | 'completed';
  exitCode?: number | null;
}

export interface ActionResult {
  async?: boolean;
  started?: boolean;
  sessionId?: string;
  sessions?: string[];
  record?: ProcessRecord;
  startedProcesses?: ProcessRecord[];
}

export interface LessonVerifyResult {
  steps: Record<string, boolean>;
  captures: Record<string, unknown>;
}

export interface SkillMatrix {
  categories: Array<{
    category: string;
    label: string;
    total: number;
    completed: number;
    scenarioIds: string[];
    completedIds: string[];
  }>;
  completedLabs: number;
  totalLabs: number;
  exportedAt: string;
}

export interface BriefingPayload {
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
  skills: SkillMatrix;
}

export interface TimelinePayload {
  ok: boolean;
  url: string;
  events: Array<Record<string, unknown>>;
  error?: string;
}

export interface ClassroomStudent {
  id: string;
  name: string;
  joinedAt: string;
  lastScenarioId?: string;
  lastStepId?: string;
  completedSteps: number;
}

export interface ClassroomState {
  code: string;
  title: string;
  createdAt: string;
  frozen: boolean;
  students: ClassroomStudent[];
}

export interface AssistantReply {
  answer: string;
  provider: string;
  offline?: boolean;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/** Poll until a session leaves "running" (logs already stream over WebSocket). */
export async function waitForSession(
  sessionId: string,
  opts?: { intervalMs?: number; maxWaitMs?: number },
): Promise<ProcessRecord | undefined> {
  const intervalMs = opts?.intervalMs ?? 400;
  const deadline = Date.now() + (opts?.maxWaitMs ?? 30 * 60 * 1000);
  while (Date.now() < deadline) {
    const procs = await cp.processes();
    const hit = procs.find((p) => p.id === sessionId);
    if (!hit || hit.status !== 'running') return hit;
    await sleep(intervalMs);
  }
  return undefined;
}

export const cp = {
  getScenarios: () => api<ScenarioSummary[]>('/scenarios'),
  getScenario: (id: string) => api<ScenarioDetail>(`/scenarios/${id}`),
  setup: (id: string) => api<ActionResult>(`/scenarios/${id}/setup`, { method: 'POST' }),
  startServices: (id: string) => api<ActionResult>(`/scenarios/${id}/services/start`, { method: 'POST' }),
  stopServices: (id: string) => api(`/scenarios/${id}/services/stop`, { method: 'POST' }),
  runStep: (id: string, stepId: string) =>
    api<ActionResult>(`/scenarios/${id}/steps/${stepId}`, { method: 'POST' }),
  runAll: (id: string) => api<ActionResult>(`/scenarios/${id}/run`, { method: 'POST' }),
  getCaptures: (id: string) => api<Record<string, unknown>>(`/scenarios/${id}/captures`),
  clearCaptures: (id: string) => api(`/scenarios/${id}/captures`, { method: 'DELETE' }),
  verifyLesson: (id: string) => api<LessonVerifyResult>(`/scenarios/${id}/lesson/verify`),
  getProgress: () => api<ProgressState>('/progress'),
  putProgress: (body: {
    scenarioId: string;
    entry: Partial<ScenarioProgressEntry> & { lastStepId?: string };
  }) => api<ProgressState>('/progress', { method: 'PUT', body: JSON.stringify(body) }),
  getSkills: () => api<SkillMatrix>('/skills'),
  exportSkillsMarkdown: async () => {
    const res = await fetch(`${controlPlaneApiBase()}/skills/export?format=md`, { cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return res.text();
  },
  getBriefing: (scenario?: string) =>
    api<BriefingPayload>(scenario ? `/briefing?scenario=${scenario}` : '/briefing'),
  getTimeline: (limit = 50) => api<TimelinePayload>(`/observe/timeline?limit=${limit}`),
  getClassroom: () => api<ClassroomState>('/classroom'),
  createClassroom: (title?: string) =>
    api<ClassroomState>('/classroom', { method: 'POST', body: JSON.stringify({ title }) }),
  freezeClassroom: (frozen: boolean) =>
    api<ClassroomState>('/classroom/freeze', { method: 'POST', body: JSON.stringify({ frozen }) }),
  joinClassroom: (code: string, name: string) =>
    api<ClassroomState>('/classroom/join', { method: 'POST', body: JSON.stringify({ code, name }) }),
  reportClassroomProgress: (body: {
    studentId: string;
    lastScenarioId?: string;
    lastStepId?: string;
    completedSteps?: number;
  }) => api<ClassroomState>('/classroom/progress', { method: 'POST', body: JSON.stringify(body) }),
  askAssistant: (body: { question: string; scenarioId?: string; stepId?: string }) =>
    api<AssistantReply>('/assistant', { method: 'POST', body: JSON.stringify(body) }),
  floci: (id: string, action: 'seed' | 'verify') =>
    api<ActionResult>(`/scenarios/${id}/floci/${action}`, { method: 'POST' }),
  platformStatus: () => api<PlatformStatus>('/platform/status'),
  esUp: () => api<ActionResult>('/platform/elasticsearch/up', { method: 'POST' }),
  esDown: () => api<ActionResult>('/platform/elasticsearch/down', { method: 'POST' }),
  flociSetup: () => api<ActionResult>('/platform/floci/setup', { method: 'POST' }),
  flociUp: () => api<ActionResult>('/platform/floci/up', { method: 'POST' }),
  flociDown: () => api<ActionResult>('/platform/floci/down', { method: 'POST' }),
  teardown: () => api<ActionResult>('/platform/teardown', { method: 'POST' }),
  clearLogs: () => api<{ ok: boolean; clearedSessions: number }>('/logs/clear', { method: 'POST' }),
  logs: (session?: string) => api<LogEntry[]>(session ? `/logs?session=${session}` : '/logs'),
  processes: () => api<ProcessRecord[]>('/processes'),
  wsUrl: () => controlPlaneWsUrl(),
};
