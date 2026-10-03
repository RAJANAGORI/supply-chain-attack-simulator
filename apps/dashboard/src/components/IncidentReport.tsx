'use client';

import { useMemo } from 'react';
import { Card, StatusPill } from '@/components/ui';
import {
  analyzeBlastRadius,
  reconstructTimeline,
  type Severity,
  type TimelineEvent,
} from '@/lib/blast-radius';
import type { BriefingPayload } from '@/lib/api';

const SEV_BADGE: Record<Severity, string> = {
  critical: 'border-state-error/30 bg-state-error/10 text-state-error',
  high: 'border-state-warn/30 bg-state-warn/10 text-state-warn',
  medium: 'border-state-info/30 bg-state-info/10 text-state-info',
  low: 'border-line bg-canvas-hover text-ink-muted',
  info: 'border-line bg-canvas-hover/50 text-ink-faint',
};

interface LabIncident {
  id: string;
  title: string;
  category: string;
  incidents: string[];
  captures: Record<string, unknown>;
}

function formatWhen(at: string | null): string {
  if (!at) return 'undated';
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * The cinematic debrief. Turns a set of completed labs into an incident report:
 * an aggregate blast radius, a reconstructed timeline of what left the machine
 * and when, and a mapping from each lab to the real incident it mirrors.
 */
export function IncidentReport({
  briefing,
  capturesByLab,
}: {
  briefing: BriefingPayload;
  capturesByLab: Record<string, Record<string, unknown>>;
}) {
  const completedLabs: LabIncident[] = useMemo(
    () =>
      briefing.labs
        .filter((l) => l.completed)
        .map((l) => ({
          id: l.id,
          title: l.title,
          category: l.category,
          incidents: l.incidents,
          captures: capturesByLab[l.id] ?? {},
        })),
    [briefing, capturesByLab],
  );

  // Aggregate blast radius across every completed lab.
  const aggregate = useMemo(() => {
    const merged: Record<string, unknown> = {};
    for (const lab of completedLabs) {
      for (const [k, v] of Object.entries(lab.captures)) merged[`${lab.id}:${k}`] = v;
    }
    return analyzeBlastRadius(merged);
  }, [completedLabs]);

  // Reconstructed incident timeline across all labs.
  const timeline: TimelineEvent[] = useMemo(() => {
    const all: TimelineEvent[] = [];
    for (const lab of completedLabs) {
      all.push(...reconstructTimeline(lab.captures, `Lab ${lab.id}`));
    }
    return all.sort((a, b) => {
      if (!a.at && !b.at) return 0;
      if (!a.at) return 1;
      if (!b.at) return -1;
      return a.at.localeCompare(b.at);
    });
  }, [completedLabs]);

  if (completedLabs.length === 0) return null;

  const criticalFindings = aggregate.findings.filter((f) => f.severity === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Incident header */}
      <Card>
        <div className="border-l-4 border-state-error/60 pl-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
            Post-incident report
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink-primary">
            {aggregate.headline}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-secondary">
            {aggregate.summary}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill
              status={aggregate.worst === 'critical' ? 'warn' : 'online'}
              label={`Worst severity: ${aggregate.worst}`}
            />
            <StatusPill status="busy" label={`${aggregate.captureCount} captures`} />
            {criticalFindings > 0 && (
              <StatusPill status="warn" label={`${criticalFindings} critical finding${criticalFindings === 1 ? '' : 's'}`} />
            )}
          </div>
        </div>
      </Card>

      {/* Timeline reconstruction */}
      {timeline.length > 0 && (
        <Card title="Timeline reconstruction" subtitle="What left the machine, in order">
          <ol className="space-y-0">
            {timeline.map((ev, i) => (
              <li key={i} className="relative flex gap-4 pb-4 last:pb-0">
                {i < timeline.length - 1 && (
                  <span aria-hidden className="absolute left-[7px] top-5 h-full w-px bg-line" />
                )}
                <span
                  className={`z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border ${
                    ev.severity === 'critical'
                      ? 'border-state-error/50 bg-state-error/30'
                      : ev.severity === 'high'
                        ? 'border-state-warn/50 bg-state-warn/30'
                        : 'border-line bg-canvas-hover'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-mono text-[11px] text-ink-faint">{formatWhen(ev.at)}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      {ev.source}
                    </span>
                    <span
                      className={`rounded border px-1.5 py-px text-[9px] font-medium uppercase tracking-wide ${SEV_BADGE[ev.severity]}`}
                    >
                      {ev.severity}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-secondary">{ev.what}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Real-incident cost mapping */}
      <Card
        title="What this cost in the real world"
        subtitle="Each lab you ran maps to a named incident. The captures above are the same shape as what those attackers took."
      >
        <ul className="space-y-4">
          {completedLabs.map((lab) => (
            <li key={lab.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-ink-faint">Lab {lab.id}</span>
                <span className="text-sm font-medium text-ink-primary">{lab.title}</span>
              </div>
              {lab.incidents.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {lab.incidents.map((inc) => (
                    <li
                      key={inc}
                      className="rounded-lg border border-line bg-canvas-hover/50 px-2.5 py-1 text-xs text-ink-secondary"
                    >
                      {inc}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-faint">
          In these incidents the exfiltration went to an attacker endpoint, not 127.0.0.1, and the
          first the victim knew was a public disclosure. You saw it in the inspector. They did not.
        </p>
      </Card>
    </div>
  );
}
