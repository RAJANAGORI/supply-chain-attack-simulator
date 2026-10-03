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
  /** Optional blind "spot the attack" drill shown before the labeled storyboard. */
  drill?: LessonDrill;
  /** Optional quiz gate: 2-3 questions drawn from the lab's DETECT.md IOCs. */
  quiz?: LessonQuizQuestion[];
  /** Optional purple-team reversal: the package the learner's control must block. */
  reversal?: { blockedPackage: string };
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
