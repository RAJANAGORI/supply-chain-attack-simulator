import type { LessonDefinition, LessonStep, LessonVerify } from './registry/lesson-types.js';
import type { ProcessRecord, ScenarioDefinition } from './registry/types.js';

function captureCount(captures: Record<string, unknown>): number {
  let total = 0;
  for (const value of Object.values(captures)) {
    if (!value || typeof value !== 'object') continue;
    const obj = value as { captures?: unknown[]; events?: unknown[] };
    if (Array.isArray(obj.captures)) total += obj.captures.length;
    else if (Array.isArray(obj.events)) total += obj.events.length;
    else if (Array.isArray(value)) total += value.length;
  }
  return total;
}

function lastStepSession(
  processes: ProcessRecord[],
  scenarioId: string,
  stepId: string,
): ProcessRecord | undefined {
  const matches = processes.filter((p) => p.scenarioId === scenarioId && p.stepId === stepId);
  if (matches.length === 0) return undefined;
  return matches[matches.length - 1];
}

export function evaluateVerify(
  verify: LessonVerify,
  ctx: {
    scenario: ScenarioDefinition;
    processes: ProcessRecord[];
    captures: Record<string, unknown>;
    step: LessonStep;
  },
): boolean {
  const { scenario, processes, captures, step } = ctx;
  switch (verify.type) {
    case 'exit-zero': {
      const target = step.registry ?? step.id;
      const session = lastStepSession(processes, scenario.id, target);
      return session?.status === 'completed';
    }
    case 'service-listening': {
      return processes.some(
        (p) => p.scenarioId === scenario.id && p.status === 'running' && Boolean(p.serviceId),
      );
    }
    case 'capture-count': {
      return captureCount(captures) >= verify.min;
    }
    default:
      return false;
  }
}

export function evaluateLessonSteps(
  lesson: LessonDefinition,
  ctx: {
    scenario: ScenarioDefinition;
    processes: ProcessRecord[];
    captures: Record<string, unknown>;
  },
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const step of lesson.steps) {
    out[step.id] = evaluateVerify(step.verify, { ...ctx, step });
  }
  return out;
}
