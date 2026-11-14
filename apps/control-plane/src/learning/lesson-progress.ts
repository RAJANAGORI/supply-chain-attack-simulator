/**
 * Lesson completion that understands branching decisions.
 *
 * When two choices goto different steps (detect vs detect-late), those steps
 * are an exclusive group: finishing either path counts, not both. Spine steps
 * (everything else) are always required.
 */
import type { LessonDefinition } from '../registry/lesson-types.js';

/** Mutually exclusive goto targets from decisions where every listed target is a real step. */
export function exclusiveStepGroups(lesson: LessonDefinition): string[][] {
  const stepIds = new Set(lesson.steps.map((s) => s.id));
  const groups: string[][] = [];
  const seen = new Set<string>();

  for (const decision of lesson.decisions ?? []) {
    const targets = [
      ...new Set(
        (decision.choices ?? [])
          .map((c) => c.effects?.goto)
          .filter((g): g is string => typeof g === 'string' && stepIds.has(g)),
      ),
    ];
    if (targets.length < 2) continue;
    const key = [...targets].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push(targets);
  }

  return groups;
}

export function requiredStepCount(lesson: LessonDefinition): number {
  if (lesson.steps.length === 0) return 0;
  const exclusive = exclusiveStepGroups(lesson);
  const exclusiveIds = new Set(exclusive.flat());
  const spine = lesson.steps.filter((s) => !exclusiveIds.has(s.id)).length;
  return spine + exclusive.length;
}

export function summarizeLessonProgress(
  lesson: LessonDefinition,
  completedSteps: string[] | undefined,
): { done: number; need: number; complete: boolean } {
  const need = requiredStepCount(lesson);
  if (need === 0) return { done: 0, need: 0, complete: false };

  const doneSet = new Set(completedSteps ?? []);
  const exclusive = exclusiveStepGroups(lesson);
  const exclusiveIds = new Set(exclusive.flat());

  let done = 0;
  for (const s of lesson.steps) {
    if (exclusiveIds.has(s.id)) continue;
    if (doneSet.has(s.id)) done += 1;
  }
  for (const group of exclusive) {
    if (group.some((id) => doneSet.has(id))) done += 1;
  }

  return { done, need, complete: done >= need };
}

export function isLessonComplete(
  lesson: LessonDefinition,
  completedSteps: string[] | undefined,
): boolean {
  return summarizeLessonProgress(lesson, completedSteps).complete;
}
