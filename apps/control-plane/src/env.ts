import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function getRepoRoot(): string {
  if (process.env.SCAS_REPO_ROOT) {
    return resolve(process.env.SCAS_REPO_ROOT);
  }
  const cwd = process.cwd();
  if (cwd.endsWith('control-plane') || cwd.includes('/apps/control-plane')) {
    return resolve(cwd, '../..');
  }
  return cwd;
}

export function buildLabEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const repoRoot = getRepoRoot();
  const env: Record<string, string> = {
    ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined) as [string, string][]),
    ...extra,
    TESTBENCH_MODE: 'enabled',
    SCAS_REPO_ROOT: repoRoot,
  };

  // Workshop env files (later files win). Includes .scas.env so SCAS_ES_URL from
  // ./run.sh / run-everything reaches lab mocks even if the CP shell missed it.
  for (const name of ['.testbench.env', '.floci.env', '.scas.env'] as const) {
    const filePath = resolve(repoRoot, name);
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    }
  }

  return env;
}

export function resolveScenarioCwd(scenarioCwd: string, serviceCwd?: string): string {
  const repoRoot = getRepoRoot();
  const base = scenarioCwd.startsWith('/') ? scenarioCwd : resolve(repoRoot, scenarioCwd);
  if (!serviceCwd || serviceCwd === '.') return base;
  return resolve(base, serviceCwd);
}
