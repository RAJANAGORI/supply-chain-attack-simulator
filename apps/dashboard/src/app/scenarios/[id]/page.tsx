'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ActRunnerCard } from '@/components/ActRunnerCard';
import { FlociRunnerCard } from '@/components/FlociRunnerCard';
import { Alert, Btn, Card, LevelBadge, PageHeader, StatusPill, WorkflowTabs } from '@/components/ui';
import { useLabSession } from '@/components/LabSessionContext';
import { ScenarioLessonRunner } from '@/components/ScenarioLessonRunner';
import { cp, waitForSession, type ActionResult, type ScenarioDetail } from '@/lib/api';

const WORKFLOW = [
  { id: 'prepare', label: 'Prepare', hint: 'Setup & services' },
  { id: 'execute', label: 'Execute', hint: 'Attack steps' },
  { id: 'observe', label: 'Observe', hint: 'Captures' },
] as const;

type Phase = (typeof WORKFLOW)[number]['id'];

export default function ScenarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { setSessionId, setLabId, setFollowAll } = useLabSession();
  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const [captures, setCaptures] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('prepare');

  useEffect(() => {
    setLabId(id);
    return () => setLabId(undefined);
  }, [id, setLabId]);

  const load = useCallback(async () => {
    try {
      setScenario(await cp.getScenario(id));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }, [id]);

  const loadCaptures = useCallback(async () => {
    try {
      setCaptures(await cp.getCaptures(id));
    } catch {
      setCaptures({});
    }
  }, [id]);

  useEffect(() => {
    load();
    loadCaptures();
    const t = setInterval(loadCaptures, 4000);
    return () => clearInterval(t);
  }, [load, loadCaptures]);

  const action = async (
    label: string,
    fn: () => Promise<ActionResult | unknown>,
    nextPhase?: Phase,
    opts?: { followAll?: boolean; /** false for long-running mock servers */ wait?: boolean },
  ) => {
    setBusy(label);
    setError('');
    setFollowAll(true);
    try {
      const res = (await fn()) as ActionResult;
      const sid = res.sessionId ?? res.sessions?.[0] ?? res.record?.id;
      if (sid) setSessionId(sid, { followAll: opts?.followAll });

      void load();

      if (sid && opts?.wait !== false) {
        const finished = await waitForSession(sid);
        if (finished?.status === 'failed') {
          setError(`${label} failed${finished.exitCode != null ? ` (exit ${finished.exitCode})` : ''}`);
        }
      }

      await load();
      await loadCaptures();
      if (nextPhase) setPhase(nextPhase);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy('');
    }
  };

  if (!scenario && !error) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <StatusPill status="busy" label="Loading lab…" />
      </div>
    );
  }

  if (error && !scenario) {
    return (
      <div className="animate-fade-in">
        <Alert variant="error">{error}</Alert>
        <Link href="/scenarios" className="mt-4 inline-block">
          <Btn variant="secondary">← Back to labs</Btn>
        </Link>
      </div>
    );
  }

  if (!scenario) return null;

  const activeCount = scenario.processes?.filter((p) => p.status === 'running').length ?? 0;
  const hasCaptures = Object.values(captures).some((v) => {
    if (!v || typeof v !== 'object') return false;
    if (Array.isArray(v) && v.length > 0) return true;
    const obj = v as { captures?: unknown[]; beacons?: unknown[]; events?: unknown[] };
    return (
      (Array.isArray(obj.captures) && obj.captures.length > 0) ||
      (Array.isArray(obj.beacons) && obj.beacons.length > 0) ||
      (Array.isArray(obj.events) && obj.events.length > 0)
    );
  });
  const lesson = scenario.lesson && 'steps' in scenario.lesson ? scenario.lesson : null;

  return (
    <div className="animate-fade-in">
      <Link href="/scenarios" className="text-xs font-medium text-ink-muted transition hover:text-brand">
        ← All labs
      </Link>

      <PageHeader
        eyebrow={`Lab ${scenario.id}`}
        title={scenario.title}
        description={
          lesson
            ? `${scenario.level} · ~${lesson.etaMinutes} min · ${lesson.category} · live terminal below`
            : `${scenario.level} · ports ${scenario.ports.join(', ')} · live output beside the lab`
        }
        action={
          <div className="flex flex-wrap gap-2">
            {busy ? <StatusPill status="busy" label={busy} /> : null}
            {activeCount > 0 && <StatusPill status="busy" label={`${activeCount} running`} />}
            <LevelBadge level={scenario.level} />
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {lesson ? (
        <ScenarioLessonRunner
          scenarioId={id}
          scenario={scenario}
          lesson={lesson}
          onReload={load}
        />
      ) : (
        <>
          {busy && (
            <div className="mb-4">
              <Alert variant="info">
                <span className="font-medium">{busy}</span> in progress — watch the live terminal below for
                backend stdout/stderr.
              </Alert>
            </div>
          )}

          <WorkflowTabs steps={[...WORKFLOW]} active={phase} onChange={(tabId) => setPhase(tabId as Phase)} />

          <div className="mt-6">
            {phase === 'prepare' && (
              <div className="space-y-4">
                <Card
                  title="One-click full lab"
                  subtitle="Runs setup → services → all attack steps — output streams in the dock"
                >
                  <Btn
                    size="lg"
                    disabled={!!busy}
                    onClick={() => action('run-all', () => cp.runAll(id), 'observe', { followAll: true })}
                  >
                    {busy === 'run-all' ? 'Running…' : 'Run full lab'}
                  </Btn>
                </Card>

                <div className="grid gap-4 @2xl:grid-cols-2">
                  <Card title="Step 1 — Setup" subtitle="Creates packages, victim app, and mock infrastructure">
                    <Btn disabled={!!busy} onClick={() => action('setup', () => cp.setup(id))}>
                      {busy === 'setup' ? 'Setting up…' : 'Run setup'}
                    </Btn>
                  </Card>
                  <Card title="Step 2 — Services" subtitle="Starts mock servers and registries">
                    <div className="flex flex-wrap gap-2">
                      <Btn
                        variant="success"
                        disabled={!!busy}
                        onClick={() =>
                          action('services', () => cp.startServices(id), 'execute', {
                            wait: false,
                            followAll: true,
                          })
                        }
                      >
                        Start services
                      </Btn>
                      <Btn
                        variant="danger"
                        disabled={!!busy}
                        onClick={() => action('stop', () => cp.stopServices(id), undefined, { wait: false })}
                      >
                        Stop
                      </Btn>
                    </div>
                    <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
                      {scenario.services.map((svc) => (
                        <li key={svc.id} className="flex items-center gap-2 text-xs text-ink-muted">
                          <span className="h-1 w-1 rounded-full bg-ink-faint" />
                          {svc.label}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>

                {scenario.flociRuntime && (
                  <FlociRunnerCard
                    runtime={scenario.flociRuntime}
                    busy={busy}
                    onSeed={
                      scenario.floci?.seed
                        ? () => action('floci-seed', () => cp.floci(id, 'seed'))
                        : undefined
                    }
                    onVerify={
                      scenario.floci?.verify
                        ? () => action('floci-verify', () => cp.floci(id, 'verify'))
                        : undefined
                    }
                  />
                )}
              </div>
            )}

            {phase === 'execute' && (
              <div className="space-y-4">
              {scenario.act && <ActRunnerCard act={scenario.act} runtime={scenario.actRuntime} />}
              <Card title="Attack steps" subtitle="Each Run streams to the live terminal below">
                <ul className="divide-y divide-line">
                  {scenario.steps.map((step, i) => (
                    <li
                      key={step.id}
                      className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-canvas-hover text-xs font-semibold text-ink-muted">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-ink-primary">{step.label}</p>
                          <p className="text-[11px] text-ink-faint">step:{step.id}</p>
                        </div>
                      </div>
                      <Btn
                        variant="secondary"
                        size="sm"
                        disabled={!!busy}
                        onClick={() => action(step.id, () => cp.runStep(id, step.id), 'observe')}
                      >
                        Run
                      </Btn>
                    </li>
                  ))}
                </ul>
              </Card>
              </div>
            )}

            {phase === 'observe' && (
              <Card
                title="Exfiltration captures"
                subtitle={
                  hasCaptures
                    ? 'Data received by mock collector — process logs stay in the dock below'
                    : 'No captures yet — run attack steps first'
                }
                action={
                  <Btn variant="ghost" size="sm" disabled={!!busy} onClick={() => action('clear', () => cp.clearCaptures(id))}>
                    Clear
                  </Btn>
                }
              >
                <pre className="max-h-72 overflow-auto rounded-xl border border-line bg-[#0c0b14] p-4 font-mono text-[11px] leading-relaxed text-white/70">
                  {JSON.stringify(captures, null, 2)}
                </pre>
              </Card>
            )}
          </div>
        </>
      )}

      <p className="mt-8 text-[11px] text-ink-faint">
        Docs: {scenario.docs.readme} · {scenario.docs.detect}
      </p>
    </div>
  );
}
