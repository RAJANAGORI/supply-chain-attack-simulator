'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Btn, LevelBadge, PageHeader, StatusPill } from '@/components/ui';
import { cp, type ProgressState, type ScenarioSummary } from '@/lib/api';

const levels = ['All', 'Beginner', 'Intermediate', 'Advanced'] as const;

export default function ScenariosPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<(typeof levels)[number]>('All');

  useEffect(() => {
    Promise.all([cp.getScenarios(), cp.getProgress().catch(() => null)])
      .then(([list, prog]) => {
        setScenarios(list);
        setProgress(prog);
        for (const s of list) {
          router.prefetch(`/scenarios/${s.id}`);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scenarios.filter((s) => {
      const matchLevel = level === 'All' || s.level === level;
      const matchQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.id.includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.lesson?.category ?? '').toLowerCase().includes(q);
      return matchLevel && matchQuery;
    });
  }, [scenarios, query, level]);

  if (error) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Labs" description="Could not load scenarios." />
        <Alert variant="error">{error} — is the control plane running on port 3101?</Alert>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Labs"
        title="Run labs with live output"
        description="Every lab opens as a guided storyboard. Live terminal stays pinned below."
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search by name, number, or category…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="focus-ring w-full max-w-md rounded-full liquid-glass px-4 py-2.5 text-sm text-ink-primary placeholder:text-ink-faint sm:w-80"
        />
        <div className="flex flex-wrap gap-2">
          {levels.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                level === l
                  ? 'bg-brand text-white shadow-glow'
                  : 'text-ink-muted hover:bg-canvas-hover hover:text-ink-primary'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-xs text-ink-muted">
        {filtered.length} lab{filtered.length !== 1 ? 's' : ''} · live terminal pinned below
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => {
          const entry = progress?.scenarios[s.id];
          const stepCount = s.lesson?.stepCount ?? 0;
          const doneSteps = entry?.completedSteps?.length ?? 0;
          const guidedDone = stepCount > 0 && doneSteps >= stepCount;
          const inProgress = stepCount > 0 && doneSteps > 0 && !guidedDone;

          return (
            <Link
              key={s.id}
              href={`/scenarios/${s.id}`}
              prefetch
              className="group glass-panel block p-5 transition hover:shadow-glow"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs text-ink-faint">#{s.id.padStart(2, '0')}</span>
                <LevelBadge level={s.level} />
              </div>
              <h2 className="mt-3 text-base font-semibold text-ink-primary transition group-hover:text-brand">
                {s.title}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(s.activeProcesses ?? 0) > 0 ? (
                  <StatusPill status="busy" label={`${s.activeProcesses} active`} />
                ) : guidedDone ? (
                  <StatusPill status="online" label="Done" />
                ) : inProgress ? (
                  <StatusPill status="busy" label={`${doneSteps}/${stepCount}`} />
                ) : (
                  <StatusPill status="offline" label="Idle" />
                )}
                {s.lesson ? (
                  <span className="text-[11px] text-ink-faint">
                    ~{s.lesson.etaMinutes} min · {s.lesson.category}
                  </span>
                ) : (
                  <span className="text-[11px] text-ink-faint">ports {s.ports.join(', ')}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && scenarios.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-ink-muted">No labs match your filters.</p>
          <Btn
            variant="ghost"
            className="mt-3"
            onClick={() => {
              setQuery('');
              setLevel('All');
            }}
          >
            Clear filters
          </Btn>
        </div>
      )}
    </div>
  );
}
