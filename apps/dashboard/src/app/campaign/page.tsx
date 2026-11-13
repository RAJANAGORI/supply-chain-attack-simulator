'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Alert, Btn, Card, PageHeader, StatusPill } from '@/components/ui';
import { cp, type CampaignStatus, type ClassroomClock } from '@/lib/api';
import { IntelFeedPanel } from '@/components/IntelFeed';
import { ExecutionGraph } from '@/components/ExecutionGraph';
import { RemediationPanel } from '@/components/RemediationPanel';

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="mt-8 border-t border-line pt-6">
      <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
      <p className="mb-4 mt-1 text-xs text-ink-muted">{hint}</p>
      {children}
    </section>
  );
}

/**
 * The three panels poll on their own and re-run their effect whenever the
 * array/object props change identity. The campaign list is re-fetched every
 * 5s, so key the memo on the scenario ids instead of the array itself.
 */
function CampaignPanels({ c }: { c: CampaignStatus }) {
  const completedKey = (c.chapters ?? [])
    .filter((ch) => ch.completed)
    .map((ch) => ch.scenario)
    .join(',');
  const completedScenarios = useMemo(
    () => (completedKey ? completedKey.split(',') : []),
    [completedKey],
  );
  const scenarioKey = (c.chapters ?? []).map((ch) => ch.scenario).join(',');
  const scenarioIds = useMemo(
    () => (scenarioKey ? scenarioKey.split(',') : []),
    [scenarioKey],
  );
  const [capturesByScenario, setCapturesByScenario] = useState<
    Record<string, Record<string, unknown>>
  >({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (scenarioIds.length === 0) {
        if (!cancelled) setCapturesByScenario({});
        return;
      }
      const entries = await Promise.all(
        scenarioIds.map(async (id) => {
          try {
            return [id, await cp.getCaptures(id)] as const;
          } catch {
            return [id, {}] as const;
          }
        }),
      );
      if (!cancelled) setCapturesByScenario(Object.fromEntries(entries));
    };
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [scenarioIds]);

  return (
    <>
      <Section
        title="Intel feed"
        hint="Briefings and evidence that unlock as you finish chapters."
      >
        <IntelFeedPanel campaignId={c.id} completedScenarios={completedScenarios} />
      </Section>

      <Section
        title="Execution graph"
        hint="How the chapters chain into one intrusion, and which steps your captures confirm."
      >
        <ExecutionGraph campaignId={c.id} capturesByScenario={capturesByScenario} />
      </Section>

      <Section
        title="Remediation"
        hint="Close the gaps this actor used. Tick items off to see your grade."
      >
        <RemediationPanel campaignId={c.id} />
      </Section>
    </>
  );
}

/**
 * Campaign map. One attacker persona threads several labs into a single
 * intrusion. Progress is read from the same per-scenario state the storyboard
 * writes, so finishing a lab advances the map with no extra bookkeeping.
 */
export default function CampaignPage() {
  const [campaigns, setCampaigns] = useState<CampaignStatus[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tabletop, setTabletop] = useState<ClassroomClock | null>(null);

  const load = useCallback(async () => {
    try {
      setCampaigns(await cp.getCampaigns());
      // Tabletop clock is optional; campaigns work fine without a classroom.
      cp.getClassroomClock().then((r) => setTabletop(r.clock)).catch(() => setTabletop(null));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Campaign"
        title="One actor, start to finish"
        description="Single labs teach moves. A campaign teaches how the moves chain. Play the chapters in order and watch one intrusion unfold."
        action={
          <Btn variant="secondary" onClick={() => void load()} className="no-print">
            Refresh
          </Btn>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {loading && campaigns.length === 0 && !error && (
        <Card title="Loading campaigns" subtitle="Reading campaigns/*.yaml from the control plane">
          <p className="text-sm text-ink-muted">Hang on - pulling the campaign map.</p>
        </Card>
      )}

      {!loading && campaigns.length === 0 && !error && (
        <Card title="No campaigns" subtitle="Add a YAML file under campaigns/ to define one">
          <p className="text-sm text-ink-muted">
            Campaigns chain existing labs into a narrative. They never change how labs run.
          </p>
        </Card>
      )}

      <div className="space-y-8">
        {campaigns.map((c) => (
          <Card
            key={c.id}
            title={c.title}
            subtitle={`${c.persona} · ${c.tagline}`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                {tabletop?.campaignId === c.id && (
                  <StatusPill
                    status="warn"
                    label={`Tabletop T+${tabletop.minute} min · ${tabletop.tick} inject${tabletop.tick === 1 ? '' : 's'}`}
                  />
                )}
                {c.done ? (
                  <StatusPill status="online" label="Campaign complete" />
                ) : (
                  <StatusPill
                    status="busy"
                    label={`${c.completedChapters}/${c.totalChapters} chapters`}
                  />
                )}
              </div>
            }
          >
            <p className="max-w-3xl text-sm leading-relaxed text-ink-secondary">{c.description}</p>

            {/* The map: an ordered chain of beats */}
            <ol className="mt-6 space-y-0">
              {(c.chapters ?? []).map((ch, i) => {
                const last = i === (c.chapters?.length ?? 0) - 1;
                return (
                  <li key={ch.scenarioId} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* connector line */}
                    {!last && (
                      <span
                        aria-hidden
                        className={`absolute left-[15px] top-8 h-full w-px ${
                          ch.completed ? 'bg-state-ok/40' : 'bg-line'
                        }`}
                      />
                    )}
                    <span
                      className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                        ch.completed
                          ? 'border-state-ok/40 bg-state-ok/15 text-state-ok'
                          : ch.current
                            ? 'border-brand/50 bg-brand/15 text-brand'
                            : 'border-line bg-canvas-hover text-ink-faint'
                      }`}
                    >
                      {ch.completed ? '✓' : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
                          {ch.beat}
                        </span>
                        {ch.current && <StatusPill status="busy" label="Next move" />}
                      </div>
                      <Link
                        href={`/scenarios/${ch.scenarioId}`}
                        className="mt-0.5 block text-sm font-medium text-ink-primary transition hover:text-brand"
                      >
                        Lab {ch.scenarioId}: {ch.title}
                      </Link>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{ch.narrative}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {c.done && (
              <div className="mt-6 rounded-xl border border-state-ok/30 bg-state-ok/8 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-state-ok">
                  Debrief
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{c.debrief}</p>
              </div>
            )}

            <CampaignPanels c={c} />
          </Card>
        ))}
      </div>
    </div>
  );
}
