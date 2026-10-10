'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActRunnerCard } from '@/components/ActRunnerCard';
import { FlociRunnerCard } from '@/components/FlociRunnerCard';
import { Alert, Btn, Card, StatusPill } from '@/components/ui';
import { useLabSession } from '@/components/LabSessionContext';
import { LabAssistant } from '@/components/LabAssistant';
import { BreachPanel } from '@/components/BreachPanel';
import { DrillCard } from '@/components/DrillCard';
import { QuizGate } from '@/components/QuizGate';
import { PurpleReversal } from '@/components/PurpleReversal';
import {
  cp,
  waitForSession,
  type ActionResult,
  type LessonAudience,
  type LessonDefinition,
  type ScenarioDetail,
} from '@/lib/api';

const STUDENT_KEY = 'scas-classroom-student';

type RoleMode = 'purple' | 'red' | 'blue';

function roleAllows(audience: LessonAudience, mode: RoleMode): boolean {
  if (mode === 'purple') return true;
  if (mode === 'red') return audience === 'attack' || audience === 'both';
  return audience === 'detect' || audience === 'both';
}

function hasCaptureData(captures: Record<string, unknown>): boolean {
  return Object.values(captures).some((v) => {
    if (!v || typeof v !== 'object') return false;
    if (Array.isArray(v) && v.length > 0) return true;
    const obj = v as { captures?: unknown[]; events?: unknown[]; beacons?: unknown[] };
    if (Array.isArray(obj.captures) && obj.captures.length > 0) return true;
    if (Array.isArray(obj.events) && obj.events.length > 0) return true;
    if (Array.isArray(obj.beacons) && obj.beacons.length > 0) return true;
    return false;
  });
}

async function syncClassroom(scenarioId: string, stepId: string, completedSteps: number) {
  try {
    const studentId = localStorage.getItem(STUDENT_KEY);
    if (!studentId) return;
    // Best-effort: include the learner's current assessment points for the leaderboard.
    let points: number | undefined;
    try {
      points = (await cp.getAssessment()).totalPoints;
    } catch {
      points = undefined;
    }
    await cp.reportClassroomProgress({
      studentId,
      lastScenarioId: scenarioId,
      lastStepId: stepId,
      completedSteps,
      points,
    });
  } catch {
    /* classroom sync is optional */
  }
}

export function ScenarioLessonRunner({
  scenarioId,
  scenario,
  lesson,
  onReload,
}: {
  scenarioId: string;
  scenario: ScenarioDetail;
  lesson: LessonDefinition;
  onReload: () => Promise<void>;
}) {
  const { setSessionId, setFollowAll } = useLabSession();
  const [role, setRole] = useState<RoleMode>('purple');
  const [section, setSection] = useState<'labs' | 'reference'>('labs');
  const [activeStepId, setActiveStepId] = useState(lesson.steps[0]?.id ?? '');
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const [captures, setCaptures] = useState<Record<string, unknown>>({});
  const [hintOpen, setHintOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [inspectorNote, setInspectorNote] = useState('');

  const visibleSteps = useMemo(
    () => lesson.steps.filter((s) => roleAllows(s.audience, role)),
    [lesson.steps, role],
  );

  const refreshVerify = useCallback(async () => {
    try {
      const res = await cp.verifyLesson(scenarioId);
      setVerified(res.steps);
      setCaptures(res.captures);
    } catch {
      try {
        setCaptures(await cp.getCaptures(scenarioId));
      } catch {
        setCaptures({});
      }
    }
  }, [scenarioId]);

  useEffect(() => {
    void refreshVerify();
    const t = setInterval(() => void refreshVerify(), 3000);
    return () => clearInterval(t);
  }, [refreshVerify]);

  useEffect(() => {
    void cp.getProgress().then((prog) => {
      const entry = prog.scenarios[scenarioId];
      const resume = entry?.currentStepId ?? prog.lastStepId;
      if (resume && lesson.steps.some((s) => s.id === resume)) {
        setActiveStepId(resume);
      }
    }).catch(() => undefined);
  }, [scenarioId, lesson.steps]);

  useEffect(() => {
    if (!visibleSteps.some((s) => s.id === activeStepId)) {
      setActiveStepId(visibleSteps[0]?.id ?? '');
    }
  }, [visibleSteps, activeStepId]);

  useEffect(() => {
    setHintOpen(false);
    setInspectorNote('');
  }, [activeStepId, role]);

  const scrollToInspector = () => {
    document.getElementById('live-inspector')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const persistProgress = useCallback(
    async (patch: { completedSteps?: string[]; hintsOpened?: string[]; currentStepId?: string }) => {
      try {
        const next = await cp.putProgress({
          scenarioId,
          entry: {
            ...patch,
            lastStepId: patch.currentStepId,
          },
        });
        const entry = next.scenarios[scenarioId];
        if (patch.currentStepId) {
          void syncClassroom(
            scenarioId,
            patch.currentStepId,
            entry?.completedSteps?.length ?? patch.completedSteps?.length ?? 0,
          );
        }
      } catch {
        /* progress is best-effort */
      }
    },
    [scenarioId],
  );

  useEffect(() => {
    if (!activeStepId) return;
    void persistProgress({ currentStepId: activeStepId });
  }, [activeStepId, persistProgress]);

  const activeIndex = visibleSteps.findIndex((s) => s.id === activeStepId);
  const activeStep = activeIndex >= 0 ? visibleSteps[activeIndex] : undefined;

  const stepUnlocked = useCallback(
    (index: number) => {
      if (index <= 0) return true;
      for (let i = 0; i < index; i++) {
        if (!verified[visibleSteps[i].id]) return false;
      }
      return true;
    },
    [verified, visibleSteps],
  );

  const runLessonStep = async () => {
    if (!activeStep) return;
    if (!stepUnlocked(activeIndex)) {
      setError('Finish the previous step first.');
      return;
    }

    const registry = activeStep.registry;
    if (registry === null) {
      setBusy(activeStep.id);
      setError('');
      setInspectorNote('');
      try {
        const check = await cp.verifyLesson(scenarioId);
        setVerified(check.steps);
        setCaptures(check.captures);
        scrollToInspector();

        const ok = !!(check.steps[activeStep.id] || hasCaptureData(check.captures));
        if (ok) {
          await persistProgress({ completedSteps: [activeStep.id], currentStepId: activeStep.id });
          const next = visibleSteps[activeIndex + 1];
          if (next) {
            setActiveStepId(next.id);
            setInspectorNote('Capture looks good. Moved you to the next step.');
          } else {
            setInspectorNote(
              'Inspector is up to date. Review the JSON below, then open DETECT.md for hardening.',
            );
          }
        } else {
          setError('No capture data yet. Run the attack steps first, then come back.');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Verify failed');
      } finally {
        setBusy('');
      }
      return;
    }

    setBusy(activeStep.id);
    setError('');
    setFollowAll(true);
    try {
      let fn: () => Promise<ActionResult | unknown>;
      let wait = true;
      if (registry === 'setup') {
        fn = () => cp.setup(scenarioId);
      } else if (registry === 'services') {
        fn = () => cp.startServices(scenarioId);
        wait = false;
      } else {
        fn = () => cp.runStep(scenarioId, registry);
      }

      const res = (await fn()) as ActionResult;
      const sid = res.sessionId ?? res.sessions?.[0] ?? res.record?.id;
      if (sid) setSessionId(sid, { followAll: true });

      if (sid && wait) {
        const finished = await waitForSession(sid);
        if (finished?.status === 'failed') {
          setError(
            `${activeStep.title} failed${finished.exitCode != null ? ` (exit ${finished.exitCode})` : ''}`,
          );
        }
      } else if (!wait) {
        // Give services a moment to bind before verify polls
        await new Promise((r) => setTimeout(r, 600));
      }

      await onReload();
      await refreshVerify();

      const check = await cp.verifyLesson(scenarioId);
      setVerified(check.steps);
      setCaptures(check.captures);

      if (check.steps[activeStep.id]) {
        await persistProgress({ completedSteps: [activeStep.id], currentStepId: activeStep.id });
        const next = visibleSteps[activeIndex + 1];
        if (next) setActiveStepId(next.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy('');
    }
  };

  const openHint = () => {
    setHintOpen((v) => !v);
    if (activeStep?.hint) {
      void persistProgress({ hintsOpened: [activeStep.id], currentStepId: activeStep.id });
    }
  };

  const doneCount = visibleSteps.filter((s) => verified[s.id]).length;
  const captureReady = hasCaptureData(captures);
  // Prefer shared :3000 when this lab uses it; otherwise the primary mock/C2 port.
  const freePortTarget = useMemo(() => {
    if (scenario.ports.includes(3000)) return 3000;
    const servicePort = scenario.services.map((s) => s.port).find((p): p is number => typeof p === 'number');
    return servicePort ?? scenario.ports[0] ?? null;
  }, [scenario.ports, scenario.services]);

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {inspectorNote && !error && <Alert variant="info">{inspectorNote}</Alert>}
      {busy && (
        <Alert variant="info">
          <span className="font-medium">{busy}</span> running - watch the live terminal.
        </Alert>
      )}

      <div className="flex flex-wrap gap-2 rounded-full liquid-glass p-1" role="tablist" aria-label="Lab sections">
        {(
          [
            { id: 'labs', label: 'Labs' },
            { id: 'reference', label: 'Quick reference' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={section === tab.id}
            onClick={() => setSection(tab.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              section === tab.id
                ? 'bg-brand text-white shadow-glow'
                : 'text-ink-muted hover:bg-canvas-hover hover:text-ink-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === 'labs' && (
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 rounded-full liquid-glass p-1">
          {(
            [
              { id: 'purple', label: 'Purple' },
              { id: 'red', label: 'Red' },
              { id: 'blue', label: 'Blue' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRole(opt.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                role === opt.id
                  ? 'bg-brand text-white shadow-glow'
                  : 'text-ink-muted hover:bg-canvas-hover hover:text-ink-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span>
            Step {Math.max(activeIndex, 0) + 1}/{visibleSteps.length}
          </span>
          <span>·</span>
          <span>
            {doneCount} verified · ~{lesson.etaMinutes} min · {lesson.category}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-2">
        <div className="space-y-4 min-w-0">
          {lesson.objectives.length > 0 && (
            <Card title="Objectives" subtitle="What you should walk away with">
              <ul className="space-y-2 text-sm text-ink-secondary">
                {lesson.objectives.map((o) => (
                  <li key={o} className="flex gap-2">
                    <span className="text-ink-faint">·</span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Storyboard" subtitle="Guided steps for this lab">
            <ol className="space-y-1">
              {visibleSteps.map((step, i) => {
                const done = !!verified[step.id];
                const current = step.id === activeStepId;
                const locked = !stepUnlocked(i);
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => setActiveStepId(step.id)}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        current
                          ? 'bg-brand/10 ring-1 ring-brand/30'
                          : locked
                            ? 'opacity-40'
                            : 'hover:bg-canvas-hover'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${
                          done
                            ? 'bg-state-ok/15 text-state-ok'
                            : current
                              ? 'bg-brand text-white'
                              : 'bg-canvas-hover text-ink-muted'
                        }`}
                      >
                        {done ? '✓' : i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink-primary">{step.title}</span>
                        <span className="mt-0.5 block text-[11px] text-ink-faint">
                          {step.audience}
                          {step.registry ? ` · ${step.registry}` : ' · inspect'}
                          {locked ? ' · locked' : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </Card>

          {scenario.act &&
            activeStep &&
            (activeStep.registry === 'run' || activeStep.registry === 'run-ci') && (
              <ActRunnerCard act={scenario.act} runtime={scenario.actRuntime} />
            )}

          {activeStep && (
            <Card title={activeStep.title} subtitle="Context for this step">
              <p className="text-sm leading-relaxed text-ink-secondary">{activeStep.teaching}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn
                  disabled={!!busy || !stepUnlocked(activeIndex)}
                  onClick={() => void runLessonStep()}
                >
                  {busy === activeStep.id
                    ? 'Checking…'
                    : activeStep.registry === null
                      ? 'Check inspector'
                      : activeStep.registry === 'services'
                        ? 'Start services'
                        : 'Run step'}
                </Btn>
                {activeStep.hint && (
                  <Btn variant="ghost" size="sm" onClick={openHint}>
                    {hintOpen ? 'Hide hint' : 'Hint'}
                  </Btn>
                )}
                {activeStep.registry === 'services' && (
                  <Btn
                    variant="danger"
                    size="sm"
                    disabled={!!busy}
                    onClick={() =>
                      void (async () => {
                        setBusy('stop');
                        try {
                          await cp.stopServices(scenarioId);
                          await onReload();
                          await refreshVerify();
                        } finally {
                          setBusy('');
                        }
                      })()
                    }
                  >
                    Stop services
                  </Btn>
                )}
              </div>
              {hintOpen && activeStep.hint && (
                <div className="mt-4 rounded-xl border border-line bg-canvas-hover/60 px-4 py-3 text-sm text-ink-muted">
                  {activeStep.hint}
                </div>
              )}
              {verified[activeStep.id] && (
                <div className="mt-4">
                  <StatusPill status="online" label="Step verified" />
                </div>
              )}
            </Card>
          )}

          <Card
            title="Services"
            subtitle="Mock collectors and registries for this lab"
          >
            <ul className="space-y-2 text-sm text-ink-muted">
              {scenario.services.map((svc) => {
                const running = scenario.processes?.some(
                  (p) => p.serviceId === svc.id && p.status === 'running',
                );
                return (
                  <li key={svc.id} className="flex items-center justify-between gap-2">
                    <span>{svc.label}</span>
                    <StatusPill
                      status={running ? 'online' : 'offline'}
                      label={running ? 'Running' : 'Stopped'}
                    />
                  </li>
                );
              })}
            </ul>
            {freePortTarget != null && (
              <div className="mt-4 rounded-xl border border-brand/35 bg-brand/10 px-3 py-3">
                <p className="text-xs font-medium text-ink-primary">
                  Port busy / EADDRINUSE?
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                  {freePortTarget === 3000
                    ? 'Labs 01-05 and 07-12 share :3000. Click Free port below, then Start services again.'
                    : `UI may show Stopped while something still holds :${freePortTarget}. Free the port, then Start services.`}
                </p>
                <div className="mt-3">
                  <Btn
                    variant="primary"
                    size="sm"
                    disabled={!!busy}
                    className="w-full sm:w-auto"
                    onClick={() =>
                      void (async () => {
                        setBusy('free-port');
                        setError('');
                        try {
                          const res = await cp.freePort(freePortTarget);
                          if (res.sessionId) await waitForSession(res.sessionId);
                          if (res.ok === false) {
                            setError(res.message || `Port :${freePortTarget} still busy`);
                          }
                          await onReload();
                          await refreshVerify();
                        } catch (e) {
                          setError(
                            e instanceof Error ? e.message : `Failed to free :${freePortTarget}`,
                          );
                        } finally {
                          setBusy('');
                        }
                      })()
                    }
                  >
                    {busy === 'free-port' ? 'Freeing port…' : `Free port :${freePortTarget}`}
                  </Btn>
                </div>
              </div>
            )}
          </Card>

          {lesson.quiz && lesson.quiz.length > 0 && doneCount === visibleSteps.length && (
            <QuizGate
              scenarioId={scenarioId}
              questions={lesson.quiz}
              onPassed={() => void refreshVerify()}
            />
          )}
        </div>

        <div className="space-y-4 min-w-0">
          {scenario.flociRuntime && (
            <FlociRunnerCard
              runtime={scenario.flociRuntime}
              busy={busy}
              onSeed={
                scenario.floci?.seed
                  ? () =>
                      void (async () => {
                        setBusy('floci-seed');
                        setError('');
                        try {
                          const res = await cp.floci(scenarioId, 'seed');
                          if (res.sessionId) setSessionId(res.sessionId, { followAll: true });
                          if (res.sessionId) await waitForSession(res.sessionId);
                          await onReload();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Floci seed failed');
                        } finally {
                          setBusy('');
                        }
                      })()
                  : undefined
              }
              onVerify={
                scenario.floci?.verify
                  ? () =>
                      void (async () => {
                        setBusy('floci-verify');
                        setError('');
                        try {
                          const res = await cp.floci(scenarioId, 'verify');
                          if (res.sessionId) setSessionId(res.sessionId, { followAll: true });
                          if (res.sessionId) await waitForSession(res.sessionId);
                          await onReload();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Floci verify failed');
                        } finally {
                          setBusy('');
                        }
                      })()
                  : undefined
              }
            />
          )}
          <div id="live-inspector" className="scroll-mt-4">
            <Card
              title="Live inspector"
              subtitle={
                captureReady
                  ? 'Mock collector data for this lab'
                  : 'Captures appear here after the attack steps fire'
              }
              action={
                <Btn
                  variant="ghost"
                  size="sm"
                  disabled={!!busy}
                  onClick={() =>
                    void (async () => {
                      setBusy('clear');
                      try {
                        await cp.clearCaptures(scenarioId);
                        await refreshVerify();
                      } finally {
                        setBusy('');
                      }
                    })()
                  }
                >
                  Clear
                </Btn>
              }
            >
              <pre className="max-h-[min(28rem,50vh)] min-h-[12rem] overflow-auto rounded-xl border border-line bg-[#0c0b14] p-4 font-mono text-[11px] leading-relaxed text-white/70">
                {JSON.stringify(captures, null, 2)}
              </pre>
              {captureReady && (
                <div className="mt-4">
                  <BreachPanel captures={captures} />
                </div>
              )}
            </Card>
          </div>

          {lesson.reversal && captureReady && (
            <PurpleReversal scenarioId={scenarioId} blockedPackage={lesson.reversal.blockedPackage} />
          )}
        </div>
      </div>
      </div>
      )}

      {section === 'reference' && (
        <div className="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-2">
          <div className="space-y-4 min-w-0">
            {lesson.drill && <DrillCard drill={lesson.drill} scenarioId={scenarioId} />}
            {lesson.mitigation && lesson.mitigation.length > 0 && (
              <Card title="Mitigation" subtitle="Full runbook in DETECT.md">
                <ul className="space-y-2 text-sm text-ink-secondary">
                  {lesson.mitigation.map((m) => (
                    <li key={m} className="flex gap-2">
                      <span className="text-ink-faint">·</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
          <div className="space-y-4 min-w-0">
            {(lesson.caseStudy || lesson.incidents.length > 0) && (
              <Card
                title="Real-world case"
                subtitle={
                  lesson.incidents.length > 0
                    ? 'Where this showed up in the wild, plus named incidents'
                    : 'Where this pattern showed up in the wild'
                }
              >
                {lesson.caseStudy && (
                  <p className="text-sm leading-relaxed text-ink-secondary">{lesson.caseStudy}</p>
                )}
                {lesson.incidents.length > 0 && (
                  <ul
                    className={`flex flex-wrap gap-2 ${lesson.caseStudy ? 'mt-4 border-t border-line pt-4' : ''}`}
                  >
                    {lesson.incidents.map((inc) => (
                      <li
                        key={inc}
                        className="rounded-lg border border-line bg-canvas-hover/50 px-2.5 py-1 text-xs text-ink-secondary"
                      >
                        {inc}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
            <LabAssistant scenarioId={scenarioId} stepId={activeStep?.id} />
          </div>
        </div>
      )}
    </div>
  );
}
