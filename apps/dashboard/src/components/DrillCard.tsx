'use client';

import { useState } from 'react';
import { Btn, Card } from '@/components/ui';
import { cp, type LessonDrill } from '@/lib/api';

const ARTIFACT_LABEL: Record<LessonDrill['artifactType'], string> = {
  diff: 'pull request diff',
  'package-page': 'registry page',
  'ci-log': 'build log',
};

/**
 * The blind drill. The learner reviews an artifact that is deliberately NOT
 * labeled malicious, makes a call, then gets the reveal. This is the mechanic
 * that builds instinct: real supply-chain attacks never announce themselves.
 *
 * The outcome is recorded to progress (picked index + correct) so the
 * assessment layer can reward a sharp eye. Nothing is exfiltrated.
 */
export function DrillCard({ drill, scenarioId }: { drill: LessonDrill; scenarioId: string }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = answered && picked === drill.answer;

  const choose = (i: number) => {
    setPicked(i);
    void cp
      .recordAssessment(scenarioId, { drill: { picked: i, correct: i === drill.answer } })
      .catch(() => undefined);
  };

  return (
    <Card
      title="Spot the attack"
      subtitle={
        answered
          ? 'The reveal'
          : `Read this ${ARTIFACT_LABEL[drill.artifactType]} and make the call - before the lab tells you anything`
      }
      className={answered ? (correct ? 'ring-1 ring-state-ok/40' : 'ring-1 ring-state-error/40') : ''}
    >
      <p className="text-sm font-medium leading-relaxed text-ink-primary">{drill.prompt}</p>

      {drill.artifactType === 'package-page' ? (
        <RegistryFrame artifact={drill.artifact} />
      ) : (
        /* The artifact, verbatim. No syntax highlighting that hints at the answer. */
        <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-[#0c0b14] p-4 font-mono text-[11px] leading-relaxed text-white/80">
          {drill.artifact}
        </pre>
      )}

      {!answered ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {drill.choices.map((choice, i) => (
            <Btn key={choice} variant="secondary" onClick={() => choose(i)}>
              {choice}
            </Btn>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              correct
                ? 'border-state-ok/30 bg-state-ok/10 text-state-ok'
                : 'border-state-error/30 bg-state-error/10 text-state-error'
            }`}
          >
            {correct
              ? 'You caught it.'
              : `You picked "${drill.choices[picked!]}". That is the call that gets you breached.`}
          </div>

          <div className="rounded-xl border border-line bg-canvas-hover/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              What it actually was
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{drill.reveal}</p>
          </div>

          <div className="rounded-xl border border-line bg-canvas-hover/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Why the wrong call fails
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{drill.explanation}</p>
          </div>

          <p className="text-[11px] leading-relaxed text-ink-faint">
            Now run the lab below. You will execute the exact attack you just judged - and this time
            you will know what to look for.
          </p>
        </div>
      )}
    </Card>
  );
}

/**
 * Renders a package-page drill artifact inside a fake browser chrome so it
 * reads like a real registry page, not a text dump. The first artifact line is
 * the package name; the rest are field lines shown as the page body. Pure
 * presentation - the content still comes from lesson.yaml.
 */
function RegistryFrame({ artifact }: { artifact: string }) {
  const lines = artifact.split('\n');
  const name = lines[0]?.trim() || 'package';
  const fields = lines.slice(1).filter((l) => l.trim().length > 0);

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-line">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-line bg-canvas-hover px-3 py-2">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-state-error/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-state-warn/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-state-ok/60" />
        </span>
        <span className="ml-2 flex-1 truncate rounded-md border border-line bg-canvas px-3 py-1 font-mono text-[11px] text-ink-muted">
          registry.npmjs.org/package/{name}
        </span>
      </div>
      {/* Page body */}
      <div className="bg-[#0f0e17] p-4">
        <p className="font-mono text-base font-semibold text-white/90">{name}</p>
        <ul className="mt-3 space-y-1.5">
          {fields.map((line, i) => {
            const idx = line.indexOf(':');
            const hasKey = idx > 0 && idx < 24;
            const key = hasKey ? line.slice(0, idx).trim() : null;
            const val = hasKey ? line.slice(idx + 1).trim() : line.trim();
            return (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2 font-mono text-[11px]">
                {key && (
                  <span className="text-white/40">{key}:</span>
                )}
                <span className="text-white/80">{val}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
