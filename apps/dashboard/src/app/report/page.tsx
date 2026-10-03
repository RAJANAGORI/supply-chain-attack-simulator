'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Btn, Card, PageHeader, StatusPill } from '@/components/ui';
import { BreachPanel } from '@/components/BreachPanel';
import { IncidentReport } from '@/components/IncidentReport';
import { Certificate } from '@/components/Certificate';
import { cp, type Assessment, type BriefingPayload } from '@/lib/api';

export default function ReportPage() {
  const [briefing, setBriefing] = useState<BriefingPayload | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [capturesByLab, setCapturesByLab] = useState<Record<string, Record<string, unknown>>>({});
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await cp.getBriefing();
      setBriefing(data);
      setError('');
      void cp.getAssessment().then(setAssessment).catch(() => setAssessment(null));
      // Pull captures for completed labs so the breach moment shows up in the debrief.
      const done = data.labs.filter((l) => l.completed);
      const entries = await Promise.all(
        done.map(async (l) => {
          try {
            return [l.id, await cp.getCaptures(l.id)] as const;
          } catch {
            return [l.id, {}] as const;
          }
        }),
      );
      setCapturesByLab(Object.fromEntries(entries));
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

          {/* The incident report is the centerpiece once at least one lab is done. */}
          <IncidentReport briefing={briefing} capturesByLab={capturesByLab} />

          {assessment && (
            <Card
              title="Score and badges"
              subtitle="Earned from completed labs, quiz gates, and blind-drill calls"
            >
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-3xl font-semibold tabular-nums text-ink-primary">
                    {assessment.totalPoints}
                    <span className="text-base text-ink-faint">/{assessment.maxPoints}</span>
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">points</p>
                </div>
                <div className="text-sm text-ink-secondary">
                  <p>{assessment.labsCompleted}/{assessment.totalLabs} labs complete</p>
                  <p>{assessment.quizzesPassed} quiz gates passed</p>
                  <p>{assessment.drillsCorrect} blind drills caught</p>
                </div>
              </div>
              {assessment.badges.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  {assessment.badges.map((b) => (
                    <li
                      key={b.id}
                      title={b.reason}
                      className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
                    >
                      {b.label}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {assessment?.certificateReady && <Certificate assessment={assessment} />}

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
                    {capturesByLab[lab.id] && (
                      <div className="mt-3">
                        <BreachPanel captures={capturesByLab[lab.id]} />
                      </div>
                    )}
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
