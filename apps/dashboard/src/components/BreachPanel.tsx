'use client';

import { useMemo } from 'react';
import { analyzeBlastRadius, type Severity } from '@/lib/blast-radius';

const SEVERITY_STYLE: Record<Severity, string> = {
  critical: 'border-state-error/30 bg-state-error/8 text-state-error',
  high: 'border-state-warn/30 bg-state-warn/8 text-state-warn',
  medium: 'border-state-info/30 bg-state-info/8 text-state-info',
  low: 'border-line bg-canvas-hover/60 text-ink-muted',
  info: 'border-line bg-canvas-hover/40 text-ink-faint',
};

const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-state-error',
  high: 'bg-state-warn',
  medium: 'bg-state-info',
  low: 'bg-ink-faint',
  info: 'bg-ink-faint',
};

/**
 * The breach moment. Renders captured exfil as a consequence, not a JSON dump.
 * Pure presentation over data the labs already collected - no new exfil.
 */
export function BreachPanel({ captures }: { captures: Record<string, unknown> }) {
  const blast = useMemo(() => analyzeBlastRadius(captures), [captures]);
  if (blast.captureCount === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-state-error/25">
      {/* Leak-site header */}
      <div className="border-b border-state-error/20 bg-[#160a0d] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[11px] uppercase tracking-widest text-state-error">
            {blast.headline}
          </p>
          <span className="rounded-md border border-state-error/30 bg-state-error/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-state-error">
            {blast.worst}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-white/60">{blast.summary}</p>
      </div>

      {/* Findings as a paste-style leak listing */}
      <div className="bg-[#0c0b14] px-4 py-3">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/30">
          what just left this machine · {blast.captureCount} capture{blast.captureCount === 1 ? '' : 's'}
        </p>
        {blast.findings.length === 0 ? (
          <p className="font-mono text-[11px] leading-relaxed text-white/40">
            no recognizable secrets in this run - but the channel is open and proven
          </p>
        ) : (
          <ul className="space-y-2">
            {blast.findings.map((f) => (
              <li
                key={`${f.label}:${f.indicator}`}
                className={`rounded-lg border px-3 py-2 ${SEVERITY_STYLE[f.severity]}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[f.severity]}`} />
                  <span className="text-xs font-semibold">{f.label}</span>
                  <span className="ml-auto font-mono text-[10px] opacity-70">{f.indicator}</span>
                </div>
                <p className="mt-1 pl-3.5 text-[11px] leading-relaxed opacity-80">{f.impact}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 border-t border-white/10 pt-2 font-mono text-[10px] leading-relaxed text-white/30">
          exfil target was 127.0.0.1 by design. in the wild this posts to an attacker endpoint and
          you never see it leave.
        </p>
      </div>
    </div>
  );
}
