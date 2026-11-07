/** Guided lesson metadata loaded from per-scenario lesson.yaml files. */

export type LessonAudience = 'attack' | 'detect' | 'both';

export type LessonVerify =
  | { type: 'exit-zero' }
  | { type: 'service-listening' }
  | { type: 'capture-count'; min: number };

export interface LessonStep {
  id: string;
  /** Registry action: setup | services | a ScenarioStep.id, or null for teaching-only */
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

/** A branching decision point interleaved with steps. */
export interface LessonDecision {
  /** Unique within this lesson. */
  id: string;
  /** The step id AFTER which this decision appears. Must match a lesson step id. */
  afterStep: string;
  /** Question presented to the learner. */
  prompt: string;
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
  /** Unique within this PR list. */
  id: string;
  /** Title shown in the inbox card. */
  title: string;
  /** Package name or file being added/modified. */
  dependency: string;
  /** Short diff summary shown as secondary text. */
  diffSummary: string;
  /** true = safe to approve, false = compromised, must block. */
  safe: boolean;
  /** Optional override for the "Block" button label. */
  blockLabel?: string;
  /** Optional override for the "Approve" button label. */
  approveLabel?: string;
}

/** PR Triage Inbox configuration for a scenario. */
export interface LessonPrTriage {
  /** Which step to show the inbox after. Defaults to last registry step if unset. */
  afterStep?: string;
  /** List of PRs to review. Must have at least 2 entries with unique IDs. */
  prs: LessonTriagedPR[];
}

export interface LessonDefinition {
  id: string;
  etaMinutes: number;
  category: string;
  incidents: string[];
  objectives: string[];
  /** Optional: 1-2 sentences tying the lab to a real supply-chain incident or class of attacks. */
  caseStudy?: string;
  /** Optional: short mitigation bullets distilled from DETECT.md (not a full runbook). */
  mitigation?: string[];
  steps: LessonStep[];
  /** Optional branching decision points interleaved with steps. */
  decisions?: LessonDecision[];
  /** Optional blind "spot the attack" drill shown before the labeled storyboard. */
  drill?: LessonDrill;
  /** Optional quiz gate: 2-3 questions drawn from the lab's DETECT.md IOCs. */
  quiz?: LessonQuizQuestion[];
  /** Optional purple-team reversal: the package the learner's control must block. */
  reversal?: { blockedPackage: string };
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
 * CI log) that is NOT labeled malicious, decides, then gets the reveal. This is
 * the mechanic that turns knowledge into instinct - the attack is never labeled
 * in real life.
 */
export interface LessonDrill {
  /** One-line setup, e.g. "A teammate opened this PR. Merge it?" */
  prompt: string;
  /** What kind of artifact the learner is reviewing. */
  artifactType: 'diff' | 'package-page' | 'ci-log';
  /** The artifact body, rendered verbatim (diff text, log lines, page fields). */
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
