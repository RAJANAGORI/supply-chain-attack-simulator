import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { getRepoRoot } from './env.js';
import type {
  DiffWorkbenchFile,
  DiffWorkbenchPayload,
  LessonDiffWorkbench,
} from './registry/lesson-types.js';

/** Fixture files carry this suffix so scanners and linters ignore the teaching copies. */
const FIXTURE_SUFFIX = '.fixture';
const MAX_FILES = 60;
const MAX_FILE_BYTES = 64 * 1024;

function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/** Collect `<path>.fixture` files under root. Returned keys drop the suffix and use "/" separators. */
function readTree(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (out.size >= MAX_FILES) return;
      const full = resolve(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(FIXTURE_SUFFIX)) continue;
      if (statSync(full).size > MAX_FILE_BYTES) continue;
      const rel = relative(root, full).split(sep).join('/').slice(0, -FIXTURE_SUFFIX.length);
      out.set(rel, readFileSync(full, 'utf8'));
    }
  };
  walk(root);
  return out;
}

/**
 * Load the git/ and tarball/ fixture trees for a scenario and pair them by path.
 * Reads only from scenarios/<slug>/<fixtureDir>; nothing touches the network.
 */
export function buildDiffWorkbench(slug: string, cfg: LessonDiffWorkbench): DiffWorkbenchPayload | null {
  const scenarioRoot = resolve(getRepoRoot(), 'scenarios', slug);
  const base = resolve(scenarioRoot, cfg.fixtureDir);
  if (!isInside(scenarioRoot, base)) return null;

  const gitRoot = resolve(base, 'git');
  const tarballRoot = resolve(base, 'tarball');
  if (!existsSync(gitRoot) || !existsSync(tarballRoot)) return null;

  const git = readTree(gitRoot);
  const tarball = readTree(tarballRoot);
  const paths = Array.from(new Set([...git.keys(), ...tarball.keys()])).sort((a, b) => a.localeCompare(b));

  const files: DiffWorkbenchFile[] = paths.map((path) => {
    const g = git.get(path) ?? null;
    const t = tarball.get(path) ?? null;
    const status: DiffWorkbenchFile['status'] =
      g === null ? 'tarball-only' : t === null ? 'git-only' : g === t ? 'same' : 'modified';
    return { path, status, git: g, tarball: t };
  });

  return {
    title: cfg.title ?? 'Tarball vs Git',
    prompt: cfg.prompt,
    gitLabel: cfg.gitLabel ?? 'Git source',
    tarballLabel: cfg.tarballLabel ?? 'Published tarball',
    files,
  };
}
