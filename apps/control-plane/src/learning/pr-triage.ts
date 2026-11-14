/**
 * PR Triage Inbox scoring. Synthetic dependency-bump PRs from lesson.yaml
 * `prTriage.prs`. Approve safe ones, block the compromise. No GitHub API.
 */

export type PrTriageAction = 'approve' | 'block';

/** Catch the bad PR. */
export const SCORE_BLOCK_CORRECT = 3;
/** Approve a safe bump. */
export const SCORE_APPROVE_CORRECT = 2;
/** Block a safe bump (false positive that would stall CI). */
export const SCORE_BLOCK_WRONG = -1;
/** Approve the compromise. */
export const SCORE_APPROVE_WRONG = -2;

export function prTriageDecisionId(prId: string): string {
  return `pr-triage-${prId}`;
}

export function scorePrTriage(safe: boolean, action: PrTriageAction): {
  scoreDelta: number;
  correct: boolean;
  choiceId: PrTriageAction;
} {
  const approve = action === 'approve';
  const correct = approve === safe;
  const scoreDelta = approve && correct
    ? SCORE_APPROVE_CORRECT
    : approve && !correct
      ? SCORE_APPROVE_WRONG
      : !approve && !safe
        ? SCORE_BLOCK_CORRECT
        : SCORE_BLOCK_WRONG;
  return { scoreDelta, correct, choiceId: action };
}
