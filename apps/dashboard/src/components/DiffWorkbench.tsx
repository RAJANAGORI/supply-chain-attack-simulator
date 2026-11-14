'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Card } from '@/components/ui';
import {
  cp,
  type DiffWorkbenchFile,
  type DiffWorkbenchFileStatus,
  type DiffWorkbenchPayload,
  type LessonDiffWorkbench,
} from '@/lib/api';
import { alignLines, countChanges, type DiffRow } from '@/lib/line-diff';

const CONTEXT = 2;

const STATUS_LABEL: Record<DiffWorkbenchFileStatus, string> = {
  same: 'identical',
  modified: 'modified',
  'git-only': 'git only',
  'tarball-only': 'tarball only',
};

const STATUS_STYLE: Record<DiffWorkbenchFileStatus, string> = {
  same: 'bg-canvas-hover text-ink-faint',
  modified: 'bg-state-warn/15 text-state-warn',
  'git-only': 'bg-state-info/15 text-state-info',
  'tarball-only': 'bg-state-error/15 text-state-error',
};

type Visible = { type: 'row'; row: DiffRow } | { type: 'gap'; count: number };

/** Hide long runs of unchanged lines, keeping CONTEXT lines around each change. */
function collapse(rows: DiffRow[], showAll: boolean): Visible[] {
  if (showAll) return rows.map((row) => ({ type: 'row', row }));
  const keep = new Array<boolean>(rows.length).fill(false);
  rows.forEach((r, i) => {
    if (r.kind === 'same') return;
    for (let k = Math.max(0, i - CONTEXT); k <= Math.min(rows.length - 1, i + CONTEXT); k++) keep[k] = true;
  });
  if (!keep.some(Boolean)) return rows.map((row) => ({ type: 'row', row }));
  const out: Visible[] = [];
  let skipped = 0;
  rows.forEach((row, i) => {
    if (keep[i]) {
      if (skipped) out.push({ type: 'gap', count: skipped });
      skipped = 0;
      out.push({ type: 'row', row });
    } else {
      skipped++;
    }
  });
  if (skipped) out.push({ type: 'gap', count: skipped });
  return out;
}

function cellStyle(kind: DiffRow['kind'], side: 'left' | 'right', hasText: boolean): string {
  if (!hasText) return 'bg-white/[0.02]';
  if (kind === 'same') return '';
  if (kind === 'removed') return 'bg-state-info/10 text-white/90';
  if (kind === 'added') return 'bg-state-error/15 text-white/95';
  return side === 'left' ? 'bg-state-warn/10 text-white/90' : 'bg-state-error/15 text-white/95';
}

function Cell({
  no,
  text,
  kind,
  side,
}: {
  no: number | null;
  text: string | null;
  kind: DiffRow['kind'];
  side: 'left' | 'right';
}) {
  return (
    <div className={`flex min-w-0 ${cellStyle(kind, side, text !== null)}`}>
      <span className="w-9 shrink-0 select-none pr-2 text-right text-white/30">{no ?? ''}</span>
      <span className="min-w-0 flex-1 whitespace-pre-wrap break-all pr-2 text-white/75">{text ?? ''}</span>
    </div>
  );
}

function FileDiff({
  file,
  gitLabel,
  tarballLabel,
  showAll,
}: {
  file: DiffWorkbenchFile;
  gitLabel: string;
  tarballLabel: string;
  showAll: boolean;
}) {
  const rows = useMemo(() => alignLines(file.git ?? '', file.tarball ?? ''), [file.git, file.tarball]);
  const visible = useMemo(() => collapse(rows, showAll), [rows, showAll]);
  const { added, removed } = useMemo(() => countChanges(rows), [rows]);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-[#0c0b14]">
      <div className="grid grid-cols-2 border-b border-line text-[11px] font-medium text-ink-muted">
        <div className="truncate px-3 py-2">{gitLabel}</div>
        <div className="truncate border-l border-line px-3 py-2">{tarballLabel}</div>
      </div>
      <div className="max-h-[min(30rem,60vh)] overflow-auto font-mono text-[11px] leading-relaxed">
        {file.status === 'git-only' && (
          <p className="border-b border-line px-3 py-2 text-[11px] text-state-info">
            Not in the tarball. Files left out by the package "files" list are normal; check why.
          </p>
        )}
        {file.status === 'tarball-only' && (
          <p className="border-b border-line px-3 py-2 text-[11px] text-state-error">
            Not in git at any commit. Nothing a reviewer reads on GitHub ever showed this file.
          </p>
        )}
        {visible.map((v, i) =>
          v.type === 'gap' ? (
            <div
              key={`gap-${i}`}
              className="border-y border-line bg-white/[0.03] px-3 py-1 text-center text-[10px] text-white/35"
            >
              {v.count} unchanged line{v.count === 1 ? '' : 's'}
            </div>
          ) : (
            <div key={`row-${i}`} className="grid grid-cols-2 divide-x divide-line">
              <Cell no={v.row.leftNo} text={v.row.left} kind={v.row.kind} side="left" />
              <Cell no={v.row.rightNo} text={v.row.right} kind={v.row.kind} side="right" />
            </div>
          ),
        )}
      </div>
      <div className="border-t border-line px-3 py-1.5 text-[10px] text-white/40">
        {file.status === 'same' ? 'No differences.' : `${removed} removed from git view, ${added} added in tarball`}
      </div>
    </div>
  );
}

/**
 * Tarball-vs-Git diff workbench. Left pane is the source a reviewer reads in the
 * repo; right pane is what the registry shipped. Both come from small in-repo
 * fixture files served by the control plane, never from a real registry.
 */
export function DiffWorkbench({
  scenarioId,
  config,
}: {
  scenarioId: string;
  config: LessonDiffWorkbench;
}) {
  const [data, setData] = useState<DiffWorkbenchPayload | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError('');
    cp.getDiffWorkbench(scenarioId)
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        const first = payload.files.find((f) => f.status !== 'same') ?? payload.files[0];
        setSelected(first?.path ?? '');
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load fixtures');
      });
    return () => {
      cancelled = true;
    };
  }, [scenarioId]);

  const current = data?.files.find((f) => f.path === selected);
  const tally = useMemo(() => {
    const t = { modified: 0, 'tarball-only': 0, 'git-only': 0, same: 0 } as Record<DiffWorkbenchFileStatus, number>;
    data?.files.forEach((f) => {
      t[f.status] += 1;
    });
    return t;
  }, [data]);

  return (
    <Card
      title={data?.title ?? config.title ?? 'Tarball vs Git'}
      subtitle="Same version number, two different trees"
    >
      {error && <Alert variant="error">{error}</Alert>}
      {!data && !error && <p className="text-sm text-ink-muted">Loading fixtures...</p>}
      {data && (
        <div className="space-y-4">
          {data.prompt && <p className="text-sm leading-relaxed text-ink-secondary">{data.prompt}</p>}

          <p className="text-[11px] text-ink-faint">
            {tally.modified} modified · {tally['tarball-only']} tarball only · {tally['git-only']} git only ·{' '}
            {tally.same} identical
          </p>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Files in this package">
            {data.files.map((f) => (
              <button
                key={f.path}
                type="button"
                role="tab"
                aria-selected={f.path === selected}
                onClick={() => setSelected(f.path)}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left font-mono text-[11px] transition ${
                  f.path === selected
                    ? 'border-brand/40 bg-brand/10 text-ink-primary'
                    : 'border-line text-ink-muted hover:bg-canvas-hover hover:text-ink-primary'
                }`}
              >
                <span>{f.path}</span>
                <span className={`rounded px-1.5 py-0.5 font-sans text-[10px] ${STATUS_STYLE[f.status]}`}>
                  {STATUS_LABEL[f.status]}
                </span>
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-[11px] text-ink-muted">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Show unchanged lines
          </label>

          {current && (
            <FileDiff
              file={current}
              gitLabel={data.gitLabel}
              tarballLabel={data.tarballLabel}
              showAll={showAll}
            />
          )}
        </div>
      )}
    </Card>
  );
}
