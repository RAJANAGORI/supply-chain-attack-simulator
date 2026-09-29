'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Btn, Card, PageHeader, StatusPill } from '@/components/ui';
import { cp, type BriefingPayload } from '@/lib/api';

export default function ReportPage() {
  const [briefing, setBriefing] = useState<BriefingPayload | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setBriefing(await cp.getBriefing());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load briefing');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const completed = briefing?.labs.filter((l) => l.completed) ?? [];
  const remaining = briefing?.labs.filter((l) => !l.completed) ?? [];

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Briefing"
        title="Briefing room"
        description="Auto-built from verified lesson steps. Use Print to save a PDF from your browser."
        action={
          <div className="flex flex-wrap gap-2 no-print">
            <Btn variant="secondary" onClick={() => void load()}>
              Refresh
            </Btn>
            <Btn onClick={() => window.print()}>Print / PDF</Btn>
          </div>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {briefing && (
        <div className="space-y-6">
          <Card title="Session summary" subtitle={`Generated ${briefing.generatedAt}`}>
            <p className="text-sm text-ink-secondary">
              {briefing.skills.completedLabs}/{briefing.skills.totalLabs} guided labs complete across{' '}
              {briefing.skills.categories.length} categories.
            </p>
          </Card>

          <Card title="What you practiced" subtitle="Completed labs">
            {completed.length === 0 ? (
              <p className="text-sm text-ink-muted">No labs fully verified yet. Finish a storyboard to populate this.</p>
            ) : (
              <ul className="space-y-4">
                {completed.map((lab) => (
                  <li key={lab.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status="online" label="Complete" />
                      <Link href={`/scenarios/${lab.id}`} className="text-sm font-medium text-ink-primary hover:text-brand">
                        Lab {lab.id}: {lab.title}
                      </Link>
                      <span className="text-[11px] text-ink-faint">{lab.category}</span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-ink-secondary">
                      {lab.objectives.map((o) => (
                        <li key={o}>· {o}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Still open" subtitle="Guided labs not fully verified">
            {remaining.length === 0 ? (
              <p className="text-sm text-ink-muted">All guided labs verified. Nice work.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {remaining.map((lab) => (
                  <li key={lab.id}>
                    <Link href={`/scenarios/${lab.id}`} className="text-sm text-ink-secondary hover:text-brand">
                      {lab.id} · {lab.title}
                      <span className="text-ink-faint"> ({lab.completedSteps.length} steps logged)</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Skills snapshot" subtitle="Same data as the Skills export">
            <ul className="space-y-2 text-sm text-ink-secondary">
              {briefing.skills.categories.map((c) => (
                <li key={c.category} className="flex justify-between gap-4">
                  <span>{c.label}</span>
                  <span className="tabular-nums text-ink-muted">
                    {c.completed}/{c.total}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
