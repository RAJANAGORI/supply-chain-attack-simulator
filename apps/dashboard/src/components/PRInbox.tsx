'use client';

import { useEffect, useState } from 'react';
import { Alert, Btn, Card, StatusPill } from '@/components/ui';
import { cp, type DecisionResult } from '@/lib/api';

type PRStatus = 'approved' | 'blocked';

type TriagePr = {
  id: string;
  title: string;
  dependency: string;
  diffSummary: string;
  safe: boolean;
  blockLabel?: string;
  approveLabel?: string;
};

/** Lesson YAML often stores "Block — reason"; show the reason under the title, not on the button. */
function blockReason(label?: string): string | undefined {
  if (!label) return undefined;
  const stripped = label.replace(/^Block\s*[—–-]\s*/i, '').trim();
  return stripped || undefined;
}

export function PRInbox({
  scenarioId,
  prs,
  onDone,
}: {
  scenarioId: string;
  /** PR list from the lesson's prTriage config. */
  prs: TriagePr[];
  /** Called when all PRs have been triaged. */
  onDone: () => void;
}) {
  const [statuses, setStatuses] = useState<Record<string, PRStatus>>({});
  const [decisions, setDecisions] = useState<DecisionResult[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const allDone = prs.every((p) => statuses[p.id]);

  // Rehydrate triage state from progress so a reload does not pretend every PR is blocked.
  useEffect(() => {
    let cancelled = false;
    void cp
      .getProgress()
      .then((prog) => {
        if (cancelled) return;
        const known = new Set(prs.map((p) => p.id));
        const next: Record<string, PRStatus> = {};
        const restored: DecisionResult[] = [];
        let score = 0;
        for (const d of prog.scenarios[scenarioId]?.decisions ?? []) {
          const m = /^pr-triage-(.+)$/.exec(d.decisionId);
          if (!m || !known.has(m[1])) continue;
          const status: PRStatus = d.choiceId === 'approve' ? 'approved' : 'blocked';
          next[m[1]] = status;
          restored.push(d);
          score += d.scoreDelta ?? 0;
        }
        if (Object.keys(next).length === 0) return;
        setStatuses((prev) => ({ ...next, ...prev }));
        setDecisions((prev) => (prev.length ? prev : restored));
        setTotalScore((prev) => (prev !== 0 ? prev : score));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [scenarioId, prs]);

  const triage = async (pr: TriagePr, approve: boolean) => {
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
          const reason = blockReason(pr.blockLabel);

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
              <div className="min-w-0 space-y-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug text-ink-primary break-words">
                    {pr.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
                    <code className="max-w-full truncate rounded bg-canvas-hover px-1.5 py-0.5 font-mono">
                      {pr.dependency}
                    </code>
                    <span className="text-ink-faint" aria-hidden>
                      ·
                    </span>
                    <span className="min-w-0 break-words text-ink-faint">{pr.diffSummary}</span>
                  </div>
                  {!status && reason && (
                    <p className="mt-1.5 text-[11px] leading-snug text-state-error/80">
                      Block if: {reason}
                    </p>
                  )}
                </div>

                {!status ? (
                  <div className="flex flex-wrap gap-2">
                    <Btn
                      size="sm"
                      variant="success"
                      disabled={isBusy}
                      onClick={() => triage(pr, true)}
                    >
                      Approve
                    </Btn>
                    <Btn
                      size="sm"
                      variant="danger"
                      disabled={isBusy}
                      onClick={() => triage(pr, false)}
                      className="max-w-full"
                    >
                      Block
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
