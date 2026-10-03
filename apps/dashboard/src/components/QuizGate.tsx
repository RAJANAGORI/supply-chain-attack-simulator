'use client';

import { useMemo, useState } from 'react';
import { Btn, Card, StatusPill } from '@/components/ui';
import { cp, type LessonQuizQuestion } from '@/lib/api';

/**
 * The quiz gate. After the storyboard is verified, the learner proves they
 * understood the blue-team side (the IOCs from DETECT.md) before the lab counts
 * as mastered. Result is recorded to progress and feeds the assessment score.
 */
export function QuizGate({
  scenarioId,
  questions,
  onPassed,
}: {
  scenarioId: string;
  questions: LessonQuizQuestion[];
  onPassed?: () => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const score = useMemo(
    () => questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0),
    [questions, answers],
  );
  const allAnswered = questions.every((_, i) => answers[i] !== undefined);
  const passed = submitted && score === questions.length;

  const submit = async () => {
    setBusy(true);
    try {
      await cp.recordAssessment(scenarioId, { quiz: { score, total: questions.length } });
      setSubmitted(true);
      if (score === questions.length) onPassed?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Prove it"
      subtitle={
        submitted
          ? passed
            ? 'Gate passed - this lab counts toward your score'
            : 'Not quite - review the explanations and try again'
          : 'A few questions from the blue-team side before this lab counts as mastered'
      }
      className={submitted ? (passed ? 'ring-1 ring-state-ok/40' : 'ring-1 ring-state-warn/40') : ''}
    >
      <ol className="space-y-5">
        {questions.map((q, qi) => {
          const chosen = answers[qi];
          const showResult = submitted;
          return (
            <li key={qi}>
              <p className="text-sm font-medium text-ink-primary">
                {qi + 1}. {q.question}
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {q.choices.map((choice, ci) => {
                  const isChosen = chosen === ci;
                  const isAnswer = q.answer === ci;
                  let cls = 'border-line text-ink-secondary hover:bg-canvas-hover';
                  if (!showResult && isChosen) cls = 'border-brand/50 bg-brand/10 text-ink-primary';
                  if (showResult && isAnswer) cls = 'border-state-ok/50 bg-state-ok/10 text-state-ok';
                  if (showResult && isChosen && !isAnswer) {
                    cls = 'border-state-error/50 bg-state-error/10 text-state-error';
                  }
                  return (
                    <button
                      key={ci}
                      type="button"
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [qi]: ci }))}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition disabled:cursor-default ${cls}`}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
              {showResult && (
                <p className="mt-2 rounded-lg bg-canvas-hover/60 px-3 py-2 text-[11px] leading-relaxed text-ink-muted">
                  {q.explain}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!submitted ? (
          <Btn disabled={!allAnswered || busy} onClick={() => void submit()}>
            {busy ? 'Scoring…' : allAnswered ? 'Submit answers' : `Answer all ${questions.length}`}
          </Btn>
        ) : (
          <>
            <StatusPill
              status={passed ? 'online' : 'warn'}
              label={`Score ${score}/${questions.length}`}
            />
            {!passed && (
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSubmitted(false);
                  setAnswers({});
                }}
              >
                Try again
              </Btn>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
