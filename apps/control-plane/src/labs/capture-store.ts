/**
 * Read lab capture payloads for the dashboard / lesson verify.
 *
 * Prefer the live mock HTTP endpoint (same URL STACK RADAR / act used).
 * If the mock is down, fall back to the on-disk JSON the mock already wrote
 * under scenarios/<slug>/infrastructure/ - that is what kept Live Inspector
 * stuck on "fetch failed" after a successful CI run when :3000 died.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import type { ScenarioCapture, ScenarioDefinition } from '../registry/types.js';
import { rewriteLabUrl } from './docker-labs.js';
import { resolveScenarioCwd } from './env.js';

function diskPathFor(scenario: ScenarioDefinition, cap: ScenarioCapture): string | null {
  try {
    const pathname = new URL(cap.url).pathname; // e.g. /captured-data
    const name = basename(pathname);
    if (!name) return null;
    const cwd = resolveScenarioCwd(scenario.setup.cwd);
    const file = resolve(cwd, 'infrastructure', `${name}.json`);
    return file;
  } catch {
    return null;
  }
}

function readDisk(scenario: ScenarioDefinition, cap: ScenarioCapture): unknown | null {
  const file = diskPathFor(scenario, cap);
  if (!file || !existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

function emptyPayloadFor(cap: ScenarioCapture): Record<string, unknown> {
  // Match the shape mock servers usually return so capture-count still works on empty.
  const path = (() => {
    try {
      return new URL(cap.url).pathname;
    } catch {
      return '';
    }
  })();
  if (path.includes('credential')) return { credentials: [] };
  if (path.includes('publish')) return { publishes: [] };
  if (path.includes('backdoor') || path.includes('pr')) return { prs: [] };
  if (path.includes('beacon')) return { beacons: [] };
  return { captures: [] };
}

export async function readCapture(
  scenario: ScenarioDefinition,
  cap: ScenarioCapture,
): Promise<unknown> {
  try {
    const response = await fetch(rewriteLabUrl(cap.url), { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      return await response.json();
    }
  } catch {
    /* fall through to disk */
  }

  const fromDisk = readDisk(scenario, cap);
  if (fromDisk != null) return fromDisk;

  return {
    ...emptyPayloadFor(cap),
    unreachable: true,
    error: 'mock unreachable (start services)',
  };
}

export async function readAllCaptures(
  scenario: ScenarioDefinition,
): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};
  for (const cap of scenario.captures) {
    results[cap.id] = await readCapture(scenario, cap);
  }
  return results;
}

export async function clearCapture(
  scenario: ScenarioDefinition,
  cap: ScenarioCapture,
): Promise<unknown> {
  if (!cap.clearUrl) return { skipped: true };

  let httpOk = false;
  try {
    const response = await fetch(rewriteLabUrl(cap.clearUrl), {
      method: 'DELETE',
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      httpOk = true;
      try {
        return await response.json();
      } catch {
        /* continue to disk clear */
      }
    }
  } catch {
    /* fall through */
  }

  const file = diskPathFor(scenario, cap);
  if (file && existsSync(file)) {
    const empty = emptyPayloadFor(cap);
    writeFileSync(file, `${JSON.stringify(empty, null, 2)}\n`, 'utf8');
    return { ...empty, cleared: 'disk', http: httpOk };
  }

  if (httpOk) return { status: 'success' };
  return { ...emptyPayloadFor(cap), unreachable: true, error: 'mock unreachable' };
}

export async function clearAllCaptures(
  scenario: ScenarioDefinition,
): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};
  for (const cap of scenario.captures) {
    results[cap.id] = await clearCapture(scenario, cap);
  }
  return results;
}
