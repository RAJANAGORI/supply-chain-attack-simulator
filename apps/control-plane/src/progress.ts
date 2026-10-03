import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import type { ProgressState, ScenarioProgressEntry } from './registry/lesson-types.js';

function progressPath(): string {
  if (process.env.SCAS_PROGRESS_PATH) {
    return resolve(process.env.SCAS_PROGRESS_PATH);
  }
  return resolve(homedir(), '.scas', 'progress.json');
}

function emptyProgress(): ProgressState {
  return { scenarios: {}, updatedAt: new Date().toISOString() };
}

export function readProgress(): ProgressState {
  const path = progressPath();
  if (!existsSync(path)) return emptyProgress();
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as ProgressState;
    if (!raw || typeof raw !== 'object') return emptyProgress();
    return {
      lastScenarioId: raw.lastScenarioId,
      lastStepId: raw.lastStepId,
      scenarios: raw.scenarios && typeof raw.scenarios === 'object' ? raw.scenarios : {},
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyProgress();
  }
}

export function writeProgress(next: ProgressState): ProgressState {
  const path = progressPath();
  mkdirSync(dirname(path), { recursive: true });
  const payload: ProgressState = {
    ...next,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

/** Wipe learner progress (storyboard resume, completed steps, hints). Used by platform teardown. */
export function resetProgress(): ProgressState {
  return writeProgress(emptyProgress());
}

export function mergeScenarioProgress(
  scenarioId: string,
  patch: Partial<ScenarioProgressEntry> & { lastStepId?: string },
): ProgressState {
  const current = readProgress();
  const prev = current.scenarios[scenarioId] ?? {
    completedSteps: [],
    hintsOpened: [],
    updatedAt: new Date().toISOString(),
  };

  const completedSteps = patch.completedSteps
    ? Array.from(new Set([...prev.completedSteps, ...patch.completedSteps]))
    : prev.completedSteps;
  const hintsOpened = patch.hintsOpened
    ? Array.from(new Set([...prev.hintsOpened, ...patch.hintsOpened]))
    : prev.hintsOpened;

  const entry: ScenarioProgressEntry = {
    completedSteps,
    hintsOpened,
    currentStepId: patch.currentStepId ?? prev.currentStepId,
    quiz: patch.quiz ?? prev.quiz,
    drill: patch.drill ?? prev.drill,
    updatedAt: new Date().toISOString(),
  };

  return writeProgress({
    lastScenarioId: scenarioId,
    lastStepId: patch.lastStepId ?? patch.currentStepId ?? current.lastStepId,
    scenarios: { ...current.scenarios, [scenarioId]: entry },
    updatedAt: entry.updatedAt,
  });
}
