import { existsSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { getRepoRoot } from './env.js';

export type ArchifyLink = {
  id: string;
  label: string;
  href: string;
};

export type ArchifyPackInfo = {
  slug: string;
  available: boolean;
  diagrams: ArchifyLink[];
  brief?: ArchifyLink;
  indexHref: string;
};

/** Absolute path to the repo `.archify` tree (HTML + briefs). */
export function getArchifyRoot(): string {
  return resolve(getRepoRoot(), '.archify');
}

function toPublicHref(absPath: string): string {
  const rel = relative(getArchifyRoot(), absPath).split('\\').join('/');
  return `/archify/${rel}`;
}

/** Prefer top-level `*-architecture.html` / `*-sequence.html`; skip review-* dirs. */
function findDiagramHtml(dir: string, kind: 'architecture' | 'sequence'): string | null {
  if (!existsSync(dir)) return null;
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && e.name.endsWith('.html')).map((e) => e.name);
  const preferred = files.find((name) => name.includes(kind) && !name.includes('review'));
  if (preferred) return join(dir, preferred);
  return files[0] ? join(dir, files[0]) : null;
}

/**
 * Resolve Archify pack assets for a scenario slug (`01-typosquatting`).
 * Browser hrefs are same-origin via the dashboard `/archify` rewrite.
 */
export function resolveArchifyPack(slug: string): ArchifyPackInfo {
  const packDir = resolve(getArchifyRoot(), 'scenarios', slug);
  const indexHref = '/archify/INDEX.md';

  if (!existsSync(packDir)) {
    return { slug, available: false, diagrams: [], indexHref };
  }

  const diagrams: ArchifyLink[] = [];
  const architecture = findDiagramHtml(join(packDir, 'architecture'), 'architecture');
  if (architecture) {
    diagrams.push({
      id: 'architecture',
      label: 'Architecture',
      href: toPublicHref(architecture),
    });
  }
  const sequence = findDiagramHtml(join(packDir, 'sequence'), 'sequence');
  if (sequence) {
    diagrams.push({
      id: 'sequence',
      label: 'Attack sequence',
      href: toPublicHref(sequence),
    });
  }

  const nn = slug.slice(0, 2);
  const briefName = `archify_S${nn}.md`;
  const briefPath = join(packDir, briefName);
  const brief = existsSync(briefPath)
    ? { id: 'brief', label: 'Brief', href: toPublicHref(briefPath) }
    : undefined;

  return {
    slug,
    available: diagrams.length > 0 || !!brief,
    diagrams,
    brief,
    indexHref,
  };
}
