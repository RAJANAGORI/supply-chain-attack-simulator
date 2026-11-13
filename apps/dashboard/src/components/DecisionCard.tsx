'use client';

import { useState } from 'react';
import { Alert, Btn, Card, StatusPill } from '@/components/ui';
import { cp, type ClassroomRole, type DecisionChoice, type DecisionResult } from '@/lib/api';
import { useClassroomRole } from '@/components/useClassroomRole';

/**
 * Renders a branching decision point interleaved with lesson steps.
 * The learner picks a choice, the API records the result (score delta + flags),
 * and the UI shows feedback. If the choice has `effects.goto`, a Continue button
 * jumps the lesson to that step id.
 */
export function DecisionCard({
  scenarioId,
  decision,
  onNavigate,
  onScoreChange,
  onPathChosen,
}: {
  scenarioId: string;
  decision: {
    id: string;
    prompt: string;
    /** Tabletop roles that own this call. Omitted means everyone. */
    roles?: ClassroomRole[];
    choices: DecisionChoice[];
  };
  /** Called with the target step id when a choice has a `goto`. */
  onNavigate: (stepId: string) => void;
  /** Called once per answer (delta may be 0) so the parent can track score and answered state. */
  onScoreChange: (delta: number) => void;
  /** Reveal the exclusive branch as soon as the choice is recorded (before Continue). */
  onPathChosen?: (stepId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [error, setError] = useState('');
  const [pendingGoto, setPendingGoto] = useState<string | null>(null);
  const myRole = useClassroomRole();
  const owners = decision.roles ?? [];
  const notMyCall = owners.length > 0 && !!myRole && !owners.includes(myRole);

  const pick = async (choice: DecisionChoice) => {
    setBusy(true);
    setError('');
    try {
      const res = await cp.recordDecision(scenarioId, {
        decisionId: decision.id,
        choiceId: choice.id,
      });

      const decisionResult: DecisionResult = {
        decisionId: decision.id,
        choiceId: choice.id,
        scoreDelta: choice.effects?.score ?? 0,
        flags: Array.isArray(choice.effects?.flag)
          ? choice.effects.flag
          : choice.effects?.flag
            ? [choice.effects.flag]
            : [],
        answeredAt: res.updatedAt,
      };
      setResult(decisionResult);

      // Always report so the parent marks this decision answered, even at score 0.
      onScoreChange(decisionResult.scoreDelta);

      // Reveal the branch in the storyboard immediately so a click away from
      // this card cannot strand the learner with no next step.
      if (choice.effects?.goto) {
        onPathChosen?.(choice.effects.goto);
      }

      // Feedback renders inline. With a goto we wait for the learner to press
      // Continue, otherwise the card would unmount before they read it.
      setPendingGoto(choice.effects?.goto ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decision failed');
    } finally {
      setBusy(false);
    }
  };

  if (notMyCall) {
    return (
      <Card title="Not your call" subtitle={`This one belongs to ${owners.join(' / ')}. You are ${myRole}.`}>
        <p className="text-sm leading-relaxed text-ink-secondary">{decision.prompt}</p>
        <p className="mt-3 text-xs text-ink-muted">Listen in and advise. Your seat decides when your own calls come up.</p>
      </Card>
    );
  }

  return (
    <Card
      title={result ? 'Decision recorded' : 'What do you do?'}
      subtitle={result ? 'Your choice has been logged' : 'Think carefully — each path teaches something different'}
      className={result ? (result.scoreDelta > 0 ? 'ring-1 ring-state-ok/40' : 'ring-1 ring-state-error/40') : ''}
    >
      {owners.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {owners.map((r) => (
            <span
              key={r}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                r === myRole
                  ? 'border-brand/30 bg-brand/10 text-brand'
                  : 'border-line bg-canvas-hover text-ink-muted'
              }`}
            >
              {r}
            </span>
          ))}
        </div>
      )}
      <p className="text-sm leading-relaxed text-ink-secondary font-medium">{decision.prompt}</p>

      {!result && (
        <div className="mt-4 flex flex-wrap gap-2">
          {decision.choices.map((choice) => (
            <Btn
              key={choice.id}
              variant="secondary"
              disabled={busy}
              onClick={() => pick(choice)}
            >
              {choice.label}
            </Btn>
          ))}
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-2">
          {decision.choices
            .filter((c) => c.id === result.choiceId)
            .map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <StatusPill
                  status={c.effects?.score && c.effects.score > 0 ? 'online' : c.effects?.score && c.effects.score < 0 ? 'warn' : 'offline'}
                  label={
                    c.effects?.score && c.effects.score > 0
                      ? `+${c.effects.score} points`
                      : c.effects?.score && c.effects.score < 0
                        ? `${c.effects.score} points`
                        : 'Neutral'
                  }
                />
                {c.effects?.flag && (
                  <span className="rounded bg-canvas-hover px-2 py-0.5 text-[11px] font-mono text-ink-muted">
                    {Array.isArray(c.effects.flag) ? c.effects.flag.join(', ') : c.effects.flag}
                  </span>
                )}
                {c.effects?.goto && (
                  <span className="text-[11px] text-ink-muted">→ jumps to step</span>
                )}
              </div>
            ))}

          {decision.choices
            .filter((c) => c.id === result.choiceId)
            .map((c) =>
              c.effects?.feedback ? (
                <p key="fb" className="mt-2 text-sm text-ink-secondary">{c.effects.feedback}</p>
              ) : null,
            )}

          {pendingGoto && (
            <div className="pt-2">
              <Btn variant="primary" onClick={() => onNavigate(pendingGoto)}>
                Continue on this path
              </Btn>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
    </Card>
  );
}
