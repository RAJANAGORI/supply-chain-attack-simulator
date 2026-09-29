import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getRepoRoot } from '../env.js';
import type { LessonDefinition } from './lesson-types.js';
import { normalizeLesson, parseLessonYaml } from './parse-lesson-yaml.js';
import type { ScenarioDefinition } from './types.js';

const cache = new Map<string, LessonDefinition | null>();

export function lessonPathFor(slug: string): string {
  return resolve(getRepoRoot(), 'scenarios', slug, 'lesson.yaml');
}

export function loadLesson(scenario: ScenarioDefinition): LessonDefinition | null {
  if (cache.has(scenario.id)) return cache.get(scenario.id) ?? null;

  const path = lessonPathFor(scenario.slug);
  if (!existsSync(path)) {
    cache.set(scenario.id, null);
    return null;
  }

  try {
    const raw = parseLessonYaml(readFileSync(path, 'utf8'));
    const lesson = normalizeLesson(raw, scenario.id);
    validateLessonAgainstRegistry(lesson, scenario);
    cache.set(scenario.id, lesson);
    return lesson;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid lesson.yaml for ${scenario.slug}: ${msg}`);
  }
}

/** Clear cache (tests / hot reload). */
export function clearLessonCache(): void {
  cache.clear();
}

export function validateLessonAgainstRegistry(
  lesson: LessonDefinition,
  scenario: ScenarioDefinition,
): void {
  const stepIds = new Set(scenario.steps.map((s) => s.id));
  const special = new Set(['setup', 'services']);

  for (const step of lesson.steps) {
    if (step.registry === null) continue;
    if (special.has(step.registry)) continue;
    if (!stepIds.has(step.registry)) {
      throw new Error(
        `step "${step.id}" registry "${step.registry}" is not setup|services|null and is missing from scenario steps`,
      );
    }
  }
}

export function withLesson<T extends ScenarioDefinition>(
  scenario: T,
): T & { lesson: LessonDefinition | null } {
  return { ...scenario, lesson: loadLesson(scenario) };
}
