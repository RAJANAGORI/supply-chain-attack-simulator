'use client';

import type { Assessment } from '@/lib/api';

/**
 * Printable certificate, shown once every lab is complete and every quiz gate
 * passed. It is the artifact a learner walks away with - proof they did not
 * just run the attacks but understood the defense.
 */
export function Certificate({ assessment }: { assessment: Assessment }) {
  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="glass-panel relative overflow-hidden p-8 sm:p-10">
      <div className="pointer-events-none absolute inset-0 border-4 border-brand/20" aria-hidden />
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-ink-faint">
          Supply Chain Attack Simulator
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink-primary sm:text-3xl">
          Certificate of Completion
        </h2>
        <div className="mx-auto mt-3 h-px w-24 bg-brand/50" />

        <p className="mt-6 text-sm leading-relaxed text-ink-secondary">
          This certifies that the holder completed all {assessment.totalLabs} supply-chain attack
          labs, passed every blue-team quiz gate, and demonstrated both the offensive and defensive
          side of each attack class - from typosquatting to CI/CD compromise.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm">
          <div>
            <p className="text-2xl font-semibold tabular-nums text-brand">{assessment.totalPoints}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-ink-faint">points</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-ink-primary">
              {assessment.quizzesPassed}
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-ink-faint">quiz gates</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-ink-primary">
              {assessment.drillsCorrect}
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-ink-faint">blind catches</p>
          </div>
        </div>

        {assessment.badges.length > 0 && (
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {assessment.badges.map((b) => (
              <li
                key={b.id}
                className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
              >
                {b.label}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-xs text-ink-faint">{today}</p>
        <p className="mt-1 text-[10px] leading-relaxed text-ink-faint">
          Localhost training environment. Every attack ran against 127.0.0.1 under TESTBENCH_MODE.
        </p>
      </div>
    </div>
  );
}
