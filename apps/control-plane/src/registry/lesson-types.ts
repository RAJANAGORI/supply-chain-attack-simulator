/** Guided lesson metadata loaded from scenarios/*/lesson.yaml */

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
