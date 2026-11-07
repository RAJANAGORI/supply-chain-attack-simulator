'use client';

import { useState } from 'react';
import { Alert, Btn, Card, StatusPill } from '@/components/ui';
import { cp, type DecisionChoice, type DecisionResult } from '@/lib/api';

/**
 * Renders a branching decision point interleaved with lesson steps.
 * The learner picks a choice, the API records the result (score delta + flags),
 * and the UI shows feedback then navigates to the `goto` step if provided.
 */
export function DecisionCard({
  scenarioId,
  decision,
  onNavigate,
  onScoreChange,
}: {
  scenarioId: string;
  decision: {
    id: string;
    prompt: string;
    choices: DecisionChoice[];
  };
  /** Called with the target step id when a choice has a `goto`. */
  onNavigate: (stepId: string) => void;
  /** Called with the score delta so the parent can show it. */
  onScoreChange: (delta: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [error, setError] = useState('');

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

      if (decisionResult.scoreDelta !== 0) {
        onScoreChange(decisionResult.scoreDelta);
      }

      if (choice.effects?.feedback) {
        // feedback is shown inline below; no navigation unless goto set
      }

      const goto = choice.effects?.goto;
      if (goto) {
        onNavigate(goto);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decision failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title={result ? 'Decision recorded' : 'What do you do?'}
      subtitle={result ? 'Your choice has been logged' : 'Think carefully — each path teaches something different'}
      className={result ? (result.scoreDelta > 0 ? 'ring-1 ring-state-ok/40' : 'ring-1 ring-state-error/40') : ''}
    >
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
