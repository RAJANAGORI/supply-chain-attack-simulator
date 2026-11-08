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

/** Where a decision choice sends the learner. */
export interface DecisionEffect {
  /** Step id to jump to when this choice is picked. */
  goto?: string;
  /** Points delta for this choice (negative = wrong path). */
  score?: number;
  /** Flag keys set on progress (stored in flags[]). */
  flag?: string | string[];
  /** Shown to the learner immediately after choosing. */
  feedback?: string;
}

/** A single choice button inside a LessonDecision. */
export interface DecisionChoice {
  /** Unique within this decision block. */
  id: string;
  /** Shown as a button label. */
  label: string;
  /** Where this choice leads. */
  effects: DecisionEffect;
}

export const CLASSROOM_ROLES = ['IC', 'Eng', 'Comms', 'Legal'] as const;
export type ClassroomRole = (typeof CLASSROOM_ROLES)[number];

/** A branching decision point interleaved with steps. */
export interface LessonDecision {
  /** Unique within this lesson. */
  id: string;
  /** The step id AFTER which this decision appears. */
  afterStep: string;
  /** Question presented to the learner. */
  prompt: string;
  /** Optional tabletop roles that own this call. Omitted means everyone. */
  roles?: ClassroomRole[];
  /** Choices rendered as selectable buttons. */
  choices: DecisionChoice[];
}

/** Stored decision result on a scenario progress entry. */
export interface DecisionResult {
  decisionId: string;
  choiceId: string;
  scoreDelta: number;
  flags: string[];
  answeredAt: string;
}

/** A single PR entry in the triaged PR inbox. */
export interface LessonTriagedPR {
  id: string;
  title: string;
  dependency: string;
  diffSummary: string;
  safe: boolean;
  blockLabel?: string;
  approveLabel?: string;
}

/** PR Triage Inbox configuration for a scenario. */
export interface LessonPrTriage {
  afterStep?: string;
  prs: LessonTriagedPR[];
}

export interface LessonDiffWorkbench {
  fixtureDir: string;
  title?: string;
  prompt?: string;
  gitLabel?: string;
  tarballLabel?: string;
  /** Show once this step is active or verified. */
  afterStep?: string;
}

export type DiffWorkbenchFileStatus = 'same' | 'modified' | 'git-only' | 'tarball-only';

export interface DiffWorkbenchFile {
  path: string;
  status: DiffWorkbenchFileStatus;
  git: string | null;
  tarball: string | null;
}

export interface DiffWorkbenchPayload {
  title: string;
  prompt?: string;
  gitLabel: string;
  tarballLabel: string;
  files: DiffWorkbenchFile[];
}

export interface LessonDefinition {
  id: string;
  etaMinutes: number;
  category: string;
  incidents: string[];
  objectives: string[];
  /** Optional: 1-2 sentences tying the lab to a real supply-chain incident. */
  caseStudy?: string;
  /** Optional: short mitigation bullets distilled from DETECT.md. */
  mitigation?: string[];
  /** Optional: MITRE ATT&CK technique ids, e.g. "T1195.002". */
  attck?: string[];
  /** Optional: NIST control or practice refs. */
  nist?: string[];
  /** Optional: lab ids worth finishing first. */
  prereqs?: string[];
  /** Optional: control slugs this lab teaches you to apply. */
  remediates?: string[];
  steps: LessonStep[];
  /** Optional branching decision points interleaved with steps. */
  decisions?: LessonDecision[];
  /** Optional blind "spot the attack" drill. */
  drill?: LessonDrill;
  /** Optional quiz gate: 2-3 questions drawn from the lab's DETECT.md IOCs. */
  quiz?: LessonQuizQuestion[];
  /**
   * Optional purple-team reversal: the package the learner's control must block.
   * `variant` means a second, mutated attacker round runs and name-only blocks fail.
   */
  reversal?: { blockedPackage: string; variant?: { entry: string; port?: number } };
  /** Opt-in Tarball-vs-Git diff workbench (fixture-backed). */
  diffWorkbench?: LessonDiffWorkbench;
  /** Opt-in teaching injection: show the PR Triage Inbox after the first 4 steps. */
  prTriageStep?: boolean;
  /** PR Triage Inbox data for this scenario. */
  prTriage?: LessonPrTriage;
}

/** A single multiple-choice quiz question. */
export interface LessonQuizQuestion {
  question: string;
  choices: string[];
  /** Index into choices that is correct. */
  answer: number;
  /** Shown after answering, regardless of right/wrong. */
  explain: string;
}

/**
 * A blind drill: the learner reviews an artifact (dependency diff, package page,
 * CI log) that is NOT labeled malicious, decides, then gets the reveal.
 */
export interface LessonDrill {
  /** One-line setup, e.g. "A teammate opened this PR. Merge it?" */
  prompt: string;
  /** What kind of artifact the learner is reviewing. */
  artifactType: 'diff' | 'package-page' | 'ci-log';
  /** The artifact body, rendered verbatim. */
  artifact: string;
  /** Decision buttons, in the order shown. */
  choices: string[];
  /** Index into choices that is the safe/correct call. */
  answer: number;
  /** Shown after the decision: what the artifact actually was. */
  reveal: string;
  /** Why the wrong choice fails - the lesson that stings. */
  explanation: string;
}

export interface LessonSummary {
  etaMinutes: number;
  category: string;
  stepCount: number;
}

/** Learner progress for a single scenario. */
export interface ScenarioProgressEntry {
  completedSteps: string[];
  hintsOpened: string[];
  /** Decision results: learner choices on branching paths. */
  decisions?: DecisionResult[];
  /** Custom flags set by decisions (e.g. delayed_response). */
  flags?: string[];
  currentStepId?: string;
  /** Quiz result once the learner passes the lab's gate. */
  quiz?: { score: number; total: number; passedAt: string };
  /** Drill outcome: the choice index the learner picked and whether it was right. */
  drill?: { picked: number; correct: boolean; answeredAt: string };
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

export interface ScenarioActMap {
  uses: string;
  local: string;
  why: string;
}

export interface ScenarioActRunner {
  tool: 'nektos/act';
  workflow: string;
  summary: string;
  maps: ScenarioActMap[];
  fallback: string;
}

export interface ActRuntime {
  mode: 'ready' | 'skipped' | 'missing' | 'too-old';
  version?: string;
  bin?: string;
  required: boolean;
}

export interface FlociCall {
  when: string;
  script: string;
  what: string;
}

export interface FlociRuntime {
  attackCalls: boolean;
  enabled: boolean;
  endpoint: string;
  reachable: boolean;
  bucket: string;
  calls: FlociCall[];
  seedNote?: string;
}

export interface ArchifyLink {
  id: string;
  label: string;
  href: string;
}

/** Control-plane listing for `.archify/scenarios/<slug>/` diagram HTML + brief. */
export interface ArchifyPackInfo {
  slug: string;
  available: boolean;
  diagrams: ArchifyLink[];
  brief?: ArchifyLink;
  indexHref: string;
}

/** Brief markdown payload for Control Center rendering. */
export interface ArchifyBriefPayload {
  slug: string;
  scenarioId: string;
  title: string;
  markdown: string;
  diagrams: ArchifyLink[];
}

export interface ScenarioDetail extends Omit<ScenarioSummary, 'lesson'> {
  setup: { command: string; cwd: string };
  services: { id: string; label: string; port?: number }[];
  steps: { id: string; label: string }[];
  captures: { id: string; label: string; url: string }[];
  floci?: { seed?: string; verify?: string };
  act?: ScenarioActRunner;
  actRuntime?: ActRuntime;
  flociRuntime?: FlociRuntime;
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

export interface Provenance {
  project: string;
  name: string;
  creator: string;
  creatorUrl: string;
  repository: string;
  website?: string;
  copyright: string;
  fingerprint: string;
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
  ok?: boolean;
  sessionId?: string;
  sessions?: string[];
  record?: ProcessRecord;
  startedProcesses?: ProcessRecord[];
  message?: string;
  port?: number;
  output?: string;
}

/** Learner-authored dependency-guard.json policy. Mirrors scenarios/_shared/dependency-guard.js. */
export interface ReversalGuardPolicy {
  block?: string[];
  allowOnly?: string[];
  denyDependencyEgress?: boolean;
  egressAllow?: string[];
}

/**
 * behavioral: held against the original and the mutated attacker through a non-name gate.
 * name-only: the block list stopped the known package but not the mutated one (or only
 *   held by name).
 * failed: the known attack still fired.
 * untested: the victim command did not run.
 */
export type ReversalGrade = 'behavioral' | 'name-only' | 'failed' | 'untested';

export interface ReversalRound {
  id: 'baseline' | 'variant';
  label: string;
  held: boolean;
  commandOk: boolean;
  capturesBefore: number;
  capturesAfter: number;
  /** Which guard gate refused the attack, read from the guard's log markers. */
  blockedBy?: 'blocklist' | 'allowlist' | 'egress';
  /** Variant round only: how the attacker mutated. */
  attacker?: {
    packageName: string;
    mutation: string;
    delivery: string;
    delayMs: number;
    encoding: string;
    seed: number;
  };
}

export interface ReversalResult {
  held: boolean;
  /** False when the victim command itself failed, so the control was never tested. */
  commandOk?: boolean;
  capturesBefore: number;
  capturesAfter: number;
  message: string;
  /** Present when the lab has a mutated second round. */
  grade?: ReversalGrade;
  /** True when the name block stopped the known attacker but the mutated one got through. */
  nameOnlyFailed?: boolean;
  rounds?: ReversalRound[];
  /** The policy the control plane wrote and ran with. */
  policy?: ReversalGuardPolicy;
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
  /** ATT&CK coverage from lesson.yaml `attck` (empty until labs are tagged). */
  techniques: Array<{ id: string; labIds: string[]; completedIds: string[] }>;
  /** Minimal adaptive tip: next lab sharing tags with, or building on, finished labs. */
  nextLab: { id: string; title: string; reason: string } | null;
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
    attck: string[];
    nist: string[];
    prereqs: string[];
    remediates: string[];
  }>;
  skills: SkillMatrix;
}

export interface TimelinePayload {
  ok: boolean;
  url: string;
  events: Array<Record<string, unknown>>;
  error?: string;
}

export interface CampaignChapterStatus {
  scenario: string;
  beat: string;
  narrative: string;
  scenarioId: string;
  title: string;
  slug: string;
  completed: boolean;
  current: boolean;
}

export interface CampaignStatus {
  id: string;
  title: string;
  persona: string;
  tagline: string;
  description: string;
  debrief: string;
  chapters: CampaignChapterStatus[];
  completedChapters: number;
  totalChapters: number;
  done: boolean;
}

export interface ClassroomStudent {
  id: string;
  name: string;
  joinedAt: string;
  lastScenarioId?: string;
  lastStepId?: string;
  completedSteps: number;
  points?: number;
  role?: ClassroomRole;
}

export interface ClassroomClock {
  tick: number;
  minute: number;
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
  clock?: ClassroomClock;
}

export interface ClassroomClockState {
  clock: ClassroomClock;
  injects: CampaignInject[];
}

export type RuleFormat = 'sigma' | 'semgrep';

export interface RuleChallengeSummary {
  scenarioId: string;
  title: string;
  formats: RuleFormat[];
}

export interface RuleChallenge {
  scenarioId: string;
  title: string;
  brief: string;
  formats: RuleFormat[];
  starters: Partial<Record<RuleFormat, string>>;
  sampleLog?: Record<string, unknown>;
  iocs: string[];
  caseCounts: Record<RuleFormat, { tp: number; benign: number }>;
  scoring: { tp: number; benign: number; indicators: number; max: number };
  deadline: string | null;
  locked: 'classroom-frozen' | 'deadline-passed' | null;
  best: number | null;
  attempts: number;
  board: Array<{ name: string; score: number; passed: boolean; format: RuleFormat; attempts: number; at: string }>;
  reference?: { sigma?: string; semgrep?: string };
}

export interface RuleCaseResult {
  id: string;
  kind: 'tp' | 'benign';
  label: string;
  input: string;
  matched: boolean;
  ok: boolean;
}

export interface RuleSubmitResult {
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
  cases?: RuleCaseResult[];
  attempt?: number;
}

export interface AssistantReply {
  answer: string;
  provider: string;
  offline?: boolean;
}

export interface Badge {
  id: string;
  label: string;
  reason: string;
}

export interface LabScore {
  scenarioId: string;
  title: string;
  completed: boolean;
  quizPassed: boolean;
  quizScore?: number;
  quizTotal?: number;
  drillCorrect?: boolean;
  points: number;
}

export interface Assessment {
  totalPoints: number;
  maxPoints: number;
  labsCompleted: number;
  totalLabs: number;
  quizzesPassed: number;
  drillsCorrect: number;
  badges: Badge[];
  labs: LabScore[];
  certificateReady: boolean;
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
  getArchify: (id: string) => api<ArchifyPackInfo>(`/scenarios/${id}/archify`),
  getArchifyBrief: (id: string) => api<ArchifyBriefPayload>(`/scenarios/${id}/archify/brief`),
  getDiffWorkbench: (id: string) => api<DiffWorkbenchPayload>(`/scenarios/${id}/diff-workbench`),
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
  getCampaigns: () => api<CampaignStatus[]>('/campaigns'),
  getCampaign: (id: string) => api<CampaignStatus>(`/campaigns/${id}`),
  getAssessment: () => api<Assessment>('/assessment'),
  recordAssessment: (id: string, body: {
    quiz?: { score: number; total: number };
    drill?: { picked: number; correct: boolean };
  }) => api<ProgressState>(`/scenarios/${id}/assessment`, { method: 'POST', body: JSON.stringify(body) }),
  recordDecision: (id: string, body: { decisionId: string; choiceId: string }) =>
    api<ProgressState>(`/scenarios/${id}/decisions`, { method: 'POST', body: JSON.stringify(body) }),
  getTimeline: (limit = 50) => api<TimelinePayload>(`/observe/timeline?limit=${limit}`),
  getClassroom: () => api<ClassroomState>('/classroom'),
  createClassroom: (title?: string) =>
    api<ClassroomState>('/classroom', { method: 'POST', body: JSON.stringify({ title }) }),
  freezeClassroom: (frozen: boolean) =>
    api<ClassroomState>('/classroom/freeze', { method: 'POST', body: JSON.stringify({ frozen }) }),
  joinClassroom: (code: string, name: string, role?: ClassroomRole) =>
    api<ClassroomState>('/classroom/join', { method: 'POST', body: JSON.stringify({ code, name, role }) }),
  getClassroomClock: () => api<ClassroomClockState>('/classroom/clock'),
  tickClassroomClock: (body: { campaignId?: string; minutes?: number; reset?: boolean }) =>
    api<ClassroomClockState>('/classroom/clock', { method: 'POST', body: JSON.stringify(body) }),
  reportClassroomProgress: (body: {
    studentId: string;
    lastScenarioId?: string;
    lastStepId?: string;
    completedSteps?: number;
    points?: number;
  }) => api<ClassroomState>('/classroom/progress', { method: 'POST', body: JSON.stringify(body) }),
  listRuleChallenges: () => api<RuleChallengeSummary[]>('/ctf'),
  getRuleChallenge: (id: string, studentId?: string) =>
    api<RuleChallenge>(`/ctf/${id}${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`),
  submitRule: (id: string, body: { format: RuleFormat; rule: string; studentId?: string }) =>
    api<RuleSubmitResult>(`/ctf/${id}/submit`, { method: 'POST', body: JSON.stringify(body) }),
  setRuleDeadline: (id: string, body: { minutes?: number }) =>
    api<{ scenarioId: string; deadline: string | null }>(`/ctf/${id}/deadline`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  askAssistant: (body: { question: string; scenarioId?: string; stepId?: string }) =>
    api<AssistantReply>('/assistant', { method: 'POST', body: JSON.stringify(body) }),
  floci: (id: string, action: 'seed' | 'verify') =>
    api<ActionResult>(`/scenarios/${id}/floci/${action}`, { method: 'POST' }),
  runReversal: (id: string, guard?: ReversalGuardPolicy) =>
    api<ActionResult & { reversal?: ReversalResult }>(`/scenarios/${id}/reversal`, {
      method: 'POST',
      ...(guard ? { body: JSON.stringify({ guard }) } : {}),
    }),
  platformStatus: () => api<PlatformStatus>('/platform/status'),
  getProvenance: () => api<Provenance>('/provenance'),
  esUp: () => api<ActionResult>('/platform/elasticsearch/up', { method: 'POST' }),
  esDown: () => api<ActionResult>('/platform/elasticsearch/down', { method: 'POST' }),
  flociSetup: () => api<ActionResult>('/platform/floci/setup', { method: 'POST' }),
  flociUp: () => api<ActionResult>('/platform/floci/up', { method: 'POST' }),
  flociDown: () => api<ActionResult>('/platform/floci/down', { method: 'POST' }),
  teardown: () => api<ActionResult>('/platform/teardown', { method: 'POST' }),
  freePort: (port = 3000) =>
    api<ActionResult>('/platform/ports/free', {
      method: 'POST',
      body: JSON.stringify({ port }),
    }),
  resetProgress: () => api<ProgressState>('/progress', { method: 'DELETE' }),
  clearLogs: () => api<{ ok: boolean; clearedSessions: number }>('/logs/clear', { method: 'POST' }),
  logs: (session?: string) => api<LogEntry[]>(session ? `/logs?session=${session}` : '/logs'),
  processes: () => api<ProcessRecord[]>('/processes'),
  wsUrl: () => controlPlaneWsUrl(),
};

/* ── Campaign API helpers ──────────────────────────────────────────────────── */

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
type InjectKind = 'intel-brief' | 'alert';

export interface CampaignEvidence {
  type: string;
  [key: string]: unknown;
}

export interface CampaignInject {
  id: string;
  when: string;
  kind: InjectKind;
  timestamp: string;
  from: string;
  subject: string;
  body: string;
  evidence?: CampaignEvidence[];
  confidence: number;
  tMinute?: number;
}

export interface ExecutionNode {
  stage: string;
  description: string;
  severity: Severity;
  source: string;
  confirmed: boolean;
  indicator?: string;
}

export interface CampaignRemediationItem {
  id: string;
  title: string;
  severity: Severity;
  weight: number;
  description: string;
  steps: string[];
  flag: string;
}

export interface RemediationGrade {
  totalPossible: number;
  earned: number;
  percentage: number;
  completedIds: string[];
  missingIds: string[];
}

export interface CampaignInjectResult {
  injects: CampaignInject[];
  campaign: { id: string; title: string };
}

export interface ExecGraphResult {
  nodes: ExecutionNode[];
  campaign: { id: string; title: string; chapters: Array<{ scenario: string; beat: string; narrative: string }> };
}

export interface RemediationResult {
  items: CampaignRemediationItem[];
  grade: RemediationGrade | null;
}

async function campaignApi<T>(campaignId: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${controlPlaneApiBase()}/campaigns/${campaignId}${path}`, {
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

export const campaign = {
  /** Resolve which injects have fired based on completed scenario IDs. */
  getInjects: (campaignId: string, completedScenarios: string[]): Promise<CampaignInjectResult> =>
    campaignApi(campaignId, '/injects', {
      method: 'POST',
      body: JSON.stringify({ completedScenarios }),
    }),

  /** Build the attack-chain execution graph from captured data. */
  getExecGraph: (campaignId: string, capturesByScenario: Record<string, Record<string, unknown>>): Promise<ExecGraphResult> =>
    campaignApi(campaignId, '/exec-graph', {
      method: 'POST',
      body: JSON.stringify({ capturesByScenario }),
    }),

  /** Grade remediation checklist completion. */
  getRemediation: (campaignId: string, completedFlags: string[]): Promise<RemediationResult> =>
    campaignApi(campaignId, '/remediation', {
      method: 'POST',
      body: JSON.stringify({ completedFlags }),
    }),
};
