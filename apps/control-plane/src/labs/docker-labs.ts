/**
 * Drive per-scenario docker compose labs from the control plane
 * when SCAS_LAB_BACKEND=docker.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getRepoRoot } from './env.js';
import { processManager } from './process-manager.js';
import type { ScenarioDefinition } from '../registry/types.js';

export function labBackend(): 'docker' | 'host' {
  return process.env.SCAS_LAB_BACKEND === 'docker' ? 'docker' : 'host';
}

export function rewriteLabUrl(url: string): string {
  const host = process.env.SCAS_CAPTURE_HOST || process.env.SCAS_PLATFORM_HOST;
  if (!host || host === '127.0.0.1' || host === 'localhost') return url;
  return url
    .replace('://127.0.0.1', `://${host}`)
    .replace('://localhost', `://${host}`);
}

export function composeFileFor(scenario: ScenarioDefinition): string | null {
  const root = getRepoRoot();
  const candidates = [
    resolve(root, 'scenarios', scenario.slug, 'docker-compose.yml'),
    resolve(root, 'scenarios', scenario.slug, 'docker-compose.yaml'),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function runCompose(
  composeFile: string,
  args: string[],
  opts: { label: string; scenarioId: string },
) {
  return processManager.runCommand({
    label: opts.label,
    command: 'docker',
    args: ['compose', '-f', composeFile, ...args],
    cwd: getRepoRoot(),
    scenarioId: opts.scenarioId,
    shell: false,
  });
}

export function dockerLabSetup(scenario: ScenarioDefinition) {
  const compose = composeFileFor(scenario);
  if (!compose) {
    throw new Error(`No docker-compose.yml for scenario ${scenario.slug}`);
  }
  return runCompose(compose, ['build'], {
    label: `Docker build ${scenario.title}`,
    scenarioId: scenario.id,
  });
}

export function dockerLabStart(scenario: ScenarioDefinition) {
  const compose = composeFileFor(scenario);
  if (!compose) {
    throw new Error(`No docker-compose.yml for scenario ${scenario.slug}`);
  }
  return runCompose(compose, ['up', '-d', '--build', '--wait', '--wait-timeout', '120'], {
    label: `Docker up ${scenario.title}`,
    scenarioId: scenario.id,
  });
}

export function dockerLabStop(scenario: ScenarioDefinition) {
  const compose = composeFileFor(scenario);
  if (!compose) {
    throw new Error(`No docker-compose.yml for scenario ${scenario.slug}`);
  }
  return runCompose(compose, ['down', '-v', '--remove-orphans'], {
    label: `Docker down ${scenario.title}`,
    scenarioId: scenario.id,
  });
}

export async function dockerLabStatus(scenario: ScenarioDefinition): Promise<{
  running: boolean;
  output: string;
}> {
  const compose = composeFileFor(scenario);
  if (!compose) return { running: false, output: 'no compose file' };
  return new Promise((resolveStatus) => {
    const proc = spawn('docker', ['compose', '-f', compose, 'ps', '-q'], {
      cwd: getRepoRoot(),
    });
    let output = '';
    proc.stdout.on('data', (c) => {
      output += c.toString();
    });
    proc.stderr.on('data', (c) => {
      output += c.toString();
    });
    proc.on('close', () => {
      resolveStatus({ running: output.trim().length > 0, output });
    });
  });
}
