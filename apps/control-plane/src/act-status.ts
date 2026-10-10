import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildLabEnv, getRepoRoot } from './env.js';

export type ActMode = 'ready' | 'skipped' | 'missing' | 'too-old';

/** What this control-plane process will actually do when a lab calls run-ci.sh. */
export interface ActRuntime {
  mode: ActMode;
  version?: string;
  bin?: string;
  required: boolean;
}

export function probeAct(): ActRuntime {
  const env = buildLabEnv();
  const required = env.SCAS_ACT_REQUIRED === '1';
  const skipped = env.SCAS_SKIP_ACT === '1';
  const localBin = resolve(getRepoRoot(), '.tools/bin/act');
  const bin = existsSync(localBin) ? localBin : 'act';

  let version: string | undefined;
  let supports = false;
  let found = false;
  try {
    const versionOut = execFileSync(bin, ['--version'], {
      encoding: 'utf8',
      timeout: 5000,
      env,
    });
    version = versionOut.trim().split('\n')[0];
    const help = execFileSync(bin, ['--help'], {
      encoding: 'utf8',
      timeout: 5000,
      env,
    });
    supports = help.includes('--local-repository');
    found = true;
  } catch {
    found = false;
  }

  if (skipped) {
    return { mode: 'skipped', version, bin: found ? bin : undefined, required };
  }
  if (!found) return { mode: 'missing', required };
  if (!supports) return { mode: 'too-old', version, bin, required };
  return { mode: 'ready', version, bin, required };
}
