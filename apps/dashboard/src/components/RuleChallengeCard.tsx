'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Btn, Card } from '@/components/ui';
import { cp, type RuleChallenge, type RuleFormat, type RuleSubmitResult } from '@/lib/api';

const STUDENT_KEY = 'scas-classroom-student';

function errorText(e: unknown): string {
  const raw = e instanceof Error ? e.message : 'Request failed';
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    return parsed.error ?? raw;
  } catch {
    return raw;
  }
}

function remaining(deadline: string | null, now: number): string | null {
  if (!deadline) return null;
  const ms = Date.parse(deadline) - now;
  if (ms <= 0) return 'time is up';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} left`;
}

/**
 * Rule challenge: write a Sigma or Semgrep rule for the lab, get scored against
 * bundled fixtures (true positives it must catch, benign samples it must leave
 * alone). Scoring happens in the control plane against local text only.
 * Renders nothing for labs that have no fixtures.
 */
export function RuleChallengeCard({
  scenarioId,
  instructor = false,
}: {
  scenarioId: string;
  /** Show the timer controls (classroom page). */
  instructor?: boolean;
}) {
  const [challenge, setChallenge] = useState<RuleChallenge | null>(null);
  const [missing, setMissing] = useState(false);
  const [format, setFormat] = useState<RuleFormat>('sigma');
  const [rule, setRule] = useState('');
  const [result, setResult] = useState<RuleSubmitResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [minutes, setMinutes] = useState('10');
  const [hintOpen, setHintOpen] = useState(false);

  const studentId = () => (typeof window === 'undefined' ? '' : localStorage.getItem(STUDENT_KEY) ?? '');

  const load = useCallback(async () => {
    try {
      const next = await cp.getRuleChallenge(scenarioId, studentId() || undefined);
      setChallenge(next);
      setMissing(false);
    } catch {
      setMissing(true);
    }
  }, [scenarioId]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Seed the editor with the starter once per format, without clobbering typing.
  useEffect(() => {
    if (challenge && !rule) setRule(challenge.starters[format] ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge?.scenarioId]);

  if (missing || !challenge) return null;

  const pickFormat = (f: RuleFormat) => {
    setFormat(f);
    setRule(challenge.starters[f] ?? '');
    setResult(null);
    setError('');
    setHintOpen(false);
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      setResult(await cp.submitRule(scenarioId, { format, rule, studentId: studentId() || undefined }));
      void load();
    } catch (e) {
      setError(errorText(e));
      void load();
    } finally {
      setBusy(false);
    }
  };

  const setTimer = async (m?: number) => {
    try {
      await cp.setRuleDeadline(scenarioId, m ? { minutes: m } : {});
      void load();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const clock = remaining(challenge.deadline, now);
  const locked = challenge.locked !== null || (challenge.deadline !== null && Date.parse(challenge.deadline) <= now);
  const counts = challenge.caseCounts[format];

  return (
    <Card
      title="Write the detection"
      subtitle={`${challenge.title}${clock ? ` - ${clock}` : ''}`}
      className={result?.passed ? 'ring-1 ring-state-ok/40' : ''}
    >
      <p className="text-sm leading-relaxed text-ink-secondary">{challenge.brief}</p>

      {challenge.sampleLog && (
        <pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-[#0c0b14] p-3 font-mono text-[11px] text-white/80">
          {JSON.stringify(challenge.sampleLog)}
        </pre>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
        Scored on {counts.tp} things to catch and {counts.benign} normal samples to leave alone. Catch: up to{' '}
        {challenge.scoring.tp} pts. Stay quiet on benign: up to {challenge.scoring.benign}. Naming the right indicators: up to{' '}
        {challenge.scoring.indicators}. Rules are checked as text against local fixtures; nothing is executed or sent anywhere.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {challenge.formats.map((f) => (
          <Btn key={f} size="sm" variant={f === format ? 'primary' : 'secondary'} onClick={() => pickFormat(f)}>
            {f === 'sigma' ? 'Sigma' : 'Semgrep'}
          </Btn>
        ))}
      </div>

      <textarea
        value={rule}
        onChange={(e) => setRule(e.target.value)}
        spellCheck={false}
        rows={12}
        disabled={locked}
        className="focus-ring mt-3 w-full rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-xs leading-relaxed text-ink-primary disabled:opacity-60"
      />

      {challenge.hints?.[format] && (
        <div className="mt-3">
          <Btn size="sm" variant="ghost" onClick={() => setHintOpen((v) => !v)}>
            {hintOpen ? 'Hide hint' : `Need a ${format === 'semgrep' ? 'Semgrep' : 'Sigma'} hint?`}
          </Btn>
          {hintOpen && (
            <div className="mt-2 rounded-xl border border-brand/25 bg-brand/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">Hint</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{challenge.hints[format]}</p>
            </div>
          )}
        </div>
      )}

      {challenge.locked && (
        <div className="mt-3">
          <Alert variant="warn">
            {challenge.locked === 'classroom-frozen'
              ? 'Classroom is frozen for debrief. Submissions are closed.'
              : 'The deadline passed. Submissions are closed.'}
          </Alert>
        </div>
      )}
      {error && !challenge.locked && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn disabled={busy || locked || !rule.trim()} onClick={() => void submit()}>
          {busy ? 'Scoring...' : 'Submit rule'}
        </Btn>
        {challenge.best !== null && (
          <span className="text-xs text-ink-muted">
            Best {challenge.best}/{challenge.scoring.max} over {challenge.attempts} attempt{challenge.attempts === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {result && <ResultPanel result={result} />}

      {challenge.reference && (challenge.reference.sigma || challenge.reference.semgrep) && (
        <div className="mt-4 rounded-xl border border-line bg-canvas-hover/50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Reference rule</p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-ink-secondary">
            {challenge.reference[format] ?? challenge.reference.sigma ?? challenge.reference.semgrep}
          </pre>
        </div>
      )}

      {challenge.board.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Rule board</p>
          <ol className="mt-2 divide-y divide-line text-sm">
            {challenge.board.map((b, i) => (
              <li key={`${b.name}-${i}`} className="flex items-center justify-between py-1.5">
                <span className="text-ink-primary">
                  {i + 1}. {b.name}
                </span>
                <span className="text-xs text-ink-muted">
                  {b.format} - {b.attempts} tr{b.attempts === 1 ? 'y' : 'ies'} -{' '}
                  <span className="font-medium text-brand">{b.score} pts</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {instructor && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <label className="text-xs text-ink-muted">
            Timer (minutes)
            <input
              value={minutes}
              onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))}
              className="focus-ring ml-2 w-16 rounded-lg border border-line bg-canvas px-2 py-1 text-sm text-ink-primary"
            />
          </label>
          <Btn size="sm" variant="secondary" disabled={!Number(minutes)} onClick={() => void setTimer(Number(minutes))}>
            Start timer
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => void setTimer()}>
            Clear
          </Btn>
        </div>
      )}
    </Card>
  );
}

function ResultPanel({ result }: { result: RuleSubmitResult }) {
  if (!result.valid) {
    return (
      <div className="mt-4">
        <Alert variant="error">
          <p className="font-medium">Rule did not parse or run (0 pts)</p>
          <ul className="mt-1 list-disc pl-4 text-xs">
            {result.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Alert>
      </div>
    );
  }
  const b = result.breakdown!;
  return (
    <div className="mt-4 space-y-3">
      <div
        className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          result.passed
            ? 'border-state-ok/30 bg-state-ok/10 text-state-ok'
            : 'border-state-warn/30 bg-state-warn/10 text-state-warn'
        }`}
      >
        {result.score}/{result.max} - caught {b.tp.caught}/{b.tp.total}, quiet on {b.benign.clean}/{b.benign.total} benign,
        indicators {b.indicators.hit}/{b.indicators.total}.
        {result.passed ? ' Clean pass.' : ' Not a clean pass yet.'}
      </div>
      {result.warnings.length > 0 && (
        <p className="text-[11px] text-ink-faint">Notes: {result.warnings.join('; ')}</p>
      )}
      <ul className="space-y-1.5">
        {result.cases?.map((c) => (
          <li
            key={c.id}
            className={`flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-xs ${
              c.ok ? 'border-state-ok/25' : 'border-state-error/30 bg-state-error/5'
            }`}
          >
            <span className="font-medium text-ink-primary">
              {c.ok ? 'OK' : c.kind === 'tp' ? 'Missed' : 'False positive'} - {c.label}
            </span>
            <code className="break-all font-mono text-[11px] text-ink-muted">{c.input}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
