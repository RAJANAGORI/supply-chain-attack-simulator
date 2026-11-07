'use client';

import { useState } from 'react';
import { Alert, Btn, Card, StatusPill } from '@/components/ui';
import { cp, type DecisionResult } from '@/lib/api';

/** A single synthetic PR entry in the triage inbox. */
interface TriagedPR {
  /** Stable id used for API scoring. */
  prId: string;
  /** Short human title for the PR. */
  title: string;
  /** The dependency or file being changed. */
  dependency: string;
  /** One-line diff-style summary of the change. */
  diffSummary: string;
  /** Whether this PR is safe (correct choice = approve). */
  safe: boolean;
  /** Label shown on the approve button. */
  approveLabel?: string;
  /** Label shown on the block button. */
  blockLabel?: string;
}

const TRIAGE_PRS: TriagedPR[] = [
  {
    prId: 'pr-typosquat',
    title: 'Add request helper library',
    dependency: 'request-lib@^1.0.0',
    diffSummary: '+ "request-lib": "^1.0.0" to dependencies',
    safe: false,
    approveLabel: 'Approve',
    blockLabel: 'Block — typosquat for requests-lib',
  },
  {
    prId: 'pr-benign-deps',
    title: 'Upgrade uuid to latest',
    dependency: 'uuid@^9.0.0',
    diffSummary: 'uuid ^8.3.2 → ^9.0.0',
    safe: true,
  },
  {
    prId: 'pr-safe-config',
    title: 'Update ESLint config',
    dependency: '.eslintrc.json',
    diffSummary: '+ "@typescript-eslint/parser", "plugin:@typescript-eslint/recommended"',
    safe: true,
  },
  {
    prId: 'pr-crypto',
    title: 'Add cryptography dependency',
    dependency: 'crypto-helper@^0.2.1',
    diffSummary: '+ "crypto-helper": "^0.2.1" to devDependencies',
    safe: false,
    approveLabel: 'Approve',
    blockLabel: 'Block — untrusted crypto package',
  },
  {
    prId: 'pr-env-fix',
    title: 'Fix environment variable loading',
    dependency: 'src/config/env.ts',
    diffSummary: '+ if (!process.env.API_URL) throw new Error("missing API_URL")',
    safe: true,
  },
  {
    prId: 'pr-data-util',
    title: 'Add data utility package',
    dependency: 'data-utils@^3.1.0',
    diffSummary: '+ "data-utils": "^3.1.0" to dependencies',
    safe: false,
    approveLabel: 'Approve',
    blockLabel: 'Block — data-utils is a supply-chain pivot target',
  },
  {
    prId: 'pr-type-fix',
    title: 'Add missing type declaration',
    dependency: 'types/index.d.ts',
    diffSummary: '+ export interface Config { apiUrl: string; timeout?: number }',
    safe: true,
  },
  {
    prId: 'pr-build-tool',
    title: 'Add build tool dependency',
    dependency: 'node-build-tools@^1.0.0',
    diffSummary: '+ "node-build-tools": "^1.0.0" to devDependencies',
    safe: false,
    approveLabel: 'Approve',
    blockLabel: 'Block — brand-new package, no reputation',
  },
];

const SCORE_APPROVE_CORRECT = 2;
const SCORE_BLOCK_WRONG = -1;
const SCORE_BLOCK_CORRECT = 3;
const SCORE_APPROVE_WRONG = -2;

type PRStatus = 'pending' | 'approved' | 'blocked';

export function PRInbox({
  scenarioId,
  onDone,
}: {
  scenarioId: string;
  /** Called when all PRs have been triaged. */
  onDone: () => void;
}) {
  const [statuses, setStatuses] = useState<Record<string, PRStatus>>({});
  const [decisions, setDecisions] = useState<DecisionResult[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const allDone = TRIAGE_PRS.every((p) => statuses[p.prId]);

  const triage = async (pr: TriagedPR, approve: boolean) => {
    if (busy) return;
    setBusy(pr.prId);
    setError('');

    try {
      // Determine if the choice was correct
      const correct = approve === pr.safe;
      const scoreDelta = approve && correct ? SCORE_APPROVE_CORRECT
        : approve && !correct ? SCORE_APPROVE_WRONG
        : !approve && !pr.safe ? SCORE_BLOCK_CORRECT
        : SCORE_BLOCK_WRONG;

      // Record via the decisions API
      await cp.recordDecision(scenarioId, {
        decisionId: `pr-triage-${pr.prId}`,
        choiceId: approve ? 'approved' : 'blocked',
      });

      const result: DecisionResult = {
        decisionId: `pr-triage-${pr.prId}`,
        choiceId: approve ? 'approved' : 'blocked',
        scoreDelta,
        flags: correct ? ['pr_triage_correct'] : ['pr_triage_incorrect'],
        answeredAt: new Date().toISOString(),
      };
      setDecisions((prev) => [...prev, result]);
      setTotalScore((prev) => prev + scoreDelta);
      setStatuses((prev) => ({ ...prev, [pr.prId]: approve ? 'approved' : 'blocked' }));

      if (allDone || TRIAGE_PRS.every((p) => p.prId === pr.prId || statuses[p.prId])) {
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
      subtitle={`Review ${TRIAGE_PRS.length} pull requests — approve safe ones, block compromised ones`}
      className={totalScore > 0 ? 'ring-1 ring-state-ok/40' : ''}
    >
      <div className="space-y-3">
        {TRIAGE_PRS.map((pr) => {
          const status = statuses[pr.prId];
          const isBusy = busy === pr.prId;

          return (
            <div
              key={pr.prId}
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
