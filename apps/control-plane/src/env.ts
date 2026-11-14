import { readFileSync, existsSync } from 'node:fs';
import { delimiter, resolve } from 'node:path';

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

const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Skip bash-only lines that Node must not treat as KEY=value. */
function isShellOnlyLine(line: string): boolean {
  return /^(if|fi|then|else|elif|for|do|done|case|esac|while|until|function|return|exit|unset|source|\.|\[|[[:space:]]*#)/.test(
    line,
  ) || line.includes('$(') || line.includes('`');
}

/**
 * Expand simple bash defaults used in .scas.env:
 * ${VAR:-default}, ${VAR-default}, $VAR
 */
export function expandEnvValue(value: string, env: Record<string, string>): string {
  const withBraces = value.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)(:-|-)?([^}]*)\}/g,
    (_m, name: string, op: string | undefined, def: string) => {
      const cur = env[name];
      if (op === ':-') return cur !== undefined && cur !== '' ? cur : def;
      if (op === '-') return cur !== undefined ? cur : def;
      return cur ?? '';
    },
  );
  return withBraces.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_m, name: string) => env[name] ?? '');
}

/**
 * Parse workshop env files (.testbench.env, .floci.env, .scas.env).
 * Accepts `KEY=value` and `export KEY=value`. Ignores shell control flow.
 */
export function applyEnvFile(content: string, into: Record<string, string>): void {
  for (const raw of content.split('\n')) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (isShellOnlyLine(line)) continue;

    if (line.startsWith('export ')) {
      line = line.slice(7).trim();
      if (!line || isShellOnlyLine(line)) continue;
    }

    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    if (!ENV_KEY.test(key)) continue;

    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    into[key] = expandEnvValue(value, into);
  }
}

export function buildLabEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const repoRoot = getRepoRoot();
  const env: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([, v]) => v !== undefined) as [string, string][],
    ),
    ...extra,
    TESTBENCH_MODE: 'enabled',
    SCAS_REPO_ROOT: repoRoot,
  };

  // Workshop env files (later files win). Includes .scas.env so SCAS_ES_URL from
  // ./run.sh / run-everything reaches lab mocks even if the CP shell missed it.
  for (const name of ['.testbench.env', '.floci.env', '.scas.env'] as const) {
    const filePath = resolve(repoRoot, name);
    if (!existsSync(filePath)) continue;
    applyEnvFile(readFileSync(filePath, 'utf8'), env);
  }

  // Forced after files so education gate cannot be turned off by a stale env file.
  env.TESTBENCH_MODE = 'enabled';
  env.SCAS_REPO_ROOT = repoRoot;

  // Mirror .scas.env PATH bootstrap so labs 05/25 find repo-local act.
  const toolsBin = resolve(repoRoot, '.tools/bin');
  if (existsSync(toolsBin)) {
    const parts = (env.PATH || process.env.PATH || '').split(delimiter).filter(Boolean);
    if (!parts.includes(toolsBin)) {
      env.PATH = [toolsBin, ...parts].join(delimiter);
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
