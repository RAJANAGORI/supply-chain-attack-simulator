'use client';

import { useState } from 'react';
import { Alert, Btn, Card, StatusPill } from '@/components/ui';
import { cp, type DecisionResult } from '@/lib/api';

type PRStatus = 'pending' | 'approved' | 'blocked';

export function PRInbox({
  scenarioId,
  prs,
  onDone,
}: {
  scenarioId: string;
  /** PR list from the lesson's prTriage config. */
  prs: { id: string; title: string; dependency: string; diffSummary: string; safe: boolean; blockLabel?: string; approveLabel?: string }[];
  /** Called when all PRs have been triaged. */
  onDone: () => void;
}) {
  const [statuses, setStatuses] = useState<Record<string, PRStatus>>({});
  const [decisions, setDecisions] = useState<DecisionResult[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const allDone = prs.every((p) => statuses[p.id]);

  const triage = async (
    pr: {
      id: string;
      title: string;
      dependency: string;
      diffSummary: string;
      safe: boolean;
      blockLabel?: string;
      approveLabel?: string;
    },
    approve: boolean,
  ) => {
    if (busy || statuses[pr.id]) return;
    setBusy(pr.id);
    setError('');

    try {
      const { result } = await cp.recordPrTriage(scenarioId, {
        prId: pr.id,
        action: approve ? 'approve' : 'block',
      });

      const entry: DecisionResult = {
        decisionId: `pr-triage-${pr.id}`,
        choiceId: result.action,
        scoreDelta: result.scoreDelta,
        flags: result.correct ? ['pr_triage_correct'] : ['pr_triage_incorrect'],
        answeredAt: new Date().toISOString(),
      };
      setDecisions((prev) => [...prev, entry]);
      setTotalScore((prev) => prev + result.scoreDelta);
      setStatuses((prev) => ({ ...prev, [pr.id]: approve ? 'approved' : 'blocked' }));

      if (prs.every((p) => p.id === pr.id || statuses[p.id])) {
        onDone();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Triage failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      title="PR Triage Inbox"
      subtitle={`Review ${prs.length} pull requests — approve safe ones, block compromised ones`}
      className={totalScore > 0 ? 'ring-1 ring-state-ok/40' : ''}
    >
      <div className="space-y-3">
        {prs.map((pr) => {
          const status = statuses[pr.id];
          const isBusy = busy === pr.id;

          return (
            <div
              key={pr.id}
              className={`rounded-xl border px-4 py-3 transition ${
                status === 'approved'
                  ? 'border-state-ok/30 bg-state-ok/5'
                  : status === 'blocked'
                    ? 'border-state-error/30 bg-state-error/5'
                    : 'border-line bg-[#0c0b14]/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-primary">{pr.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                    <code className="rounded bg-canvas-hover px-1.5 py-0.5 font-mono">{pr.dependency}</code>
                    <span>·</span>
                    <span className="text-ink-faint truncate">{pr.diffSummary}</span>
                  </div>
                </div>

                {status === 'pending' ? (
                  <div className="flex shrink-0 gap-2">
                    <Btn
                      size="sm"
                      variant="success"
                      disabled={isBusy}
                      onClick={() => triage(pr, true)}
                    >
                      {pr.approveLabel || 'Approve'}
                    </Btn>
                    <Btn
                      size="sm"
                      variant="danger"
                      disabled={isBusy}
                      onClick={() => triage(pr, false)}
                    >
                      {pr.blockLabel || 'Block'}
                    </Btn>
                  </div>
                ) : (
                  <StatusPill
                    status={status === 'approved' ? 'online' : 'warn'}
                    label={status === 'approved' ? 'Approved' : 'Blocked'}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusPill
            status={totalScore > 0 ? 'online' : totalScore === 0 ? 'offline' : 'warn'}
            label={`Score: ${totalScore > 0 ? '+' : ''}${totalScore}`}
          />
          <span className="text-xs text-ink-muted">
            {decisions.filter((d) => d.scoreDelta > 0).length} correct / {decisions.length} total
          </span>
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
