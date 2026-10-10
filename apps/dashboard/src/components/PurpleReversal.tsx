'use client';

import { useState } from 'react';
import { Alert, Btn, Card, StatusPill } from '@/components/ui';
import { cp, waitForSession, type ReversalResult } from '@/lib/api';

/**
 * Purple-team reversal. The learner has run the attack and detected it; now
 * they author the control that would have stopped it and re-run the attack to
 * prove the control holds. For package labs the control is a dependency-guard
 * blocklist in the victim working directory; the control plane re-runs the
 * victim with the guard preloaded and checks whether a new capture appears.
 *
 * This is the step that closes the loop: attack -> detect -> prevent.
 */
export function PurpleReversal({
  scenarioId,
  blockedPackage,
}: {
  scenarioId: string;
  /** The package name the learner should block, e.g. "request-lib". */
  blockedPackage: string;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReversalResult | null>(null);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const res = await cp.runReversal(scenarioId);
      if (res.sessionId) void waitForSession(res.sessionId).catch(() => undefined);
      if (res.reversal) setResult(res.reversal);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reversal failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Purple-team reversal"
      subtitle="Author the control, then re-run the attack against it"
      className={
        result ? (result.held ? 'ring-1 ring-state-ok/40' : 'ring-1 ring-state-error/40') : ''
      }
    >
      <p className="text-sm leading-relaxed text-ink-secondary">
        You ran the attack and saw the capture. Now stop it. Write a file named{' '}
        <code className="rounded bg-canvas-hover px-1.5 py-0.5 font-mono text-[11px] text-ink-primary">
          dependency-guard.json
        </code>{' '}
        in this lab's victim directory that blocks the malicious package:
      </p>
      <pre className="mt-3 overflow-auto rounded-xl border border-line bg-[#0c0b14] p-4 font-mono text-[11px] leading-relaxed text-white/80">
        {`{
  "block": ["${blockedPackage}"]
}`}
      </pre>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
        When you run the reversal, the victim starts with your guard preloaded. If the guard refuses
        the package, the payload never executes and no new capture lands in the inspector.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Btn variant="success" disabled={busy} onClick={() => void run()}>
          {busy ? 'Re-running attack…' : 'Re-run attack against my control'}
        </Btn>
        {result && (
          <StatusPill
            status={result.commandOk === false ? 'warn' : result.held ? 'online' : 'warn'}
            label={
              result.commandOk === false
                ? 'Run failed'
                : result.held
                  ? 'Control held'
                  : 'Attack still fired'
            }
          />
        )}
      </div>

      {error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {result && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
            result.held
              ? 'border-state-ok/30 bg-state-ok/8 text-state-ok'
              : 'border-state-error/30 bg-state-error/8 text-state-error'
          }`}
        >
          <p className="font-medium">{result.message}</p>
          <p className="mt-1 text-[11px] opacity-80">
            captures before: {result.capturesBefore} · after: {result.capturesAfter}
          </p>
          {result.held && (
            <p className="mt-2 text-[11px] opacity-80">
              This is the full loop: you executed the attack, detected it in the inspector, and
              wrote the control that blocks it. That is the job.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
