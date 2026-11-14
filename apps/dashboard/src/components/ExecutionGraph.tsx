'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { campaign as campaignApi } from '@/lib/api';
import { StatusPill } from '@/components/ui';
import {
  analyzeBlastRadius,
  reconstructTimeline,
  type BlastRadius,
  type TimelineEvent,
} from '@/lib/blast-radius';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
type ChainStage = 'install' | 'lifecycle' | 'exfil' | 'persist' | 'discover';

interface ExecutionNode {
  stage: string;
  description: string;
  severity: Severity;
  source: string;
  confirmed: boolean;
  indicator?: string;
  chainStage?: ChainStage;
}

interface CampaignSummary {
  id: string;
  title: string;
  chapters: Array<{ scenario: string; beat: string; narrative: string }>;
}

const severityDot: Record<Severity, string> = {
  critical: 'bg-state-error',
  high: 'bg-state-error/80',
  medium: 'bg-state-warn',
  low: 'bg-brand',
  info: 'bg-ink-faint',
};

const severityText: Record<Severity, string> = {
  critical: 'text-state-error',
  high: 'text-state-error',
  medium: 'text-state-warn',
  low: 'text-brand',
  info: 'text-ink-muted',
};

const severityBorder: Record<Severity, string> = {
  critical: 'border-state-error/30 bg-state-error/5',
  high: 'border-state-error/25 bg-state-error/5',
  medium: 'border-state-warn/30 bg-state-warn/5',
  low: 'border-brand/25 bg-brand/5',
  info: 'border-line bg-canvas-hover/30',
};

const chainStageOrder: Record<ChainStage, number> = {
  discover: 0,
  install: 1,
  lifecycle: 2,
  exfil: 3,
  persist: 4,
};

const chainStageLabel: Record<ChainStage, string> = {
  discover: 'Discover',
  install: 'Install',
  lifecycle: 'Lifecycle',
  exfil: 'Exfil',
  persist: 'Persist',
};

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

function stitchTimeline(
  capturesByScenario: Record<string, Record<string, unknown>>,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const [scenarioId, captures] of Object.entries(capturesByScenario)) {
    events.push(...reconstructTimeline(captures, scenarioId));
  }
  events.sort((a, b) => {
    if (!a.at && !b.at) return 0;
    if (!a.at) return 1;
    if (!b.at) return -1;
    return a.at.localeCompare(b.at);
  });
  return events;
}

function classifyStage(event: TimelineEvent): ChainStage {
  const w = event.what.toLowerCase();
  if (
    w.includes('exfil') ||
    w.includes('POST') ||
    w.includes('http') ||
    w.includes('phoning') ||
    w.includes('beacon')
  ) {
    return 'exfil';
  }
  if (w.includes('fetch') && !w.includes('http')) return 'install';
  if (
    w.includes('install') ||
    w.includes('import') ||
    w.includes('require') ||
    w.includes('npm') ||
    w.includes('pull')
  ) {
    return 'install';
  }
  if (w.includes('hook') || w.includes('postinstall') || w.includes('lifecycle') || w.includes('script')) {
    return 'lifecycle';
  }
  if (w.includes('env') || w.includes('discover') || w.includes('enum') || w.includes('recon') || w.includes('probe')) {
    return 'discover';
  }
  if (w.includes('persist') || w.includes('registry') || w.includes('mirror')) return 'persist';
  return 'install';
}

function buildChain(events: TimelineEvent[]): Array<{ stage: ChainStage; events: TimelineEvent[] }> {
  const grouped = new Map<ChainStage, TimelineEvent[]>();
  for (const e of events) {
    const stage = classifyStage(e);
    if (!grouped.has(stage)) grouped.set(stage, []);
    grouped.get(stage)!.push(e);
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => chainStageOrder[a] - chainStageOrder[b])
    .map(([stage, evs]) => ({ stage, events: evs }));
}

function ChainStageNode({
  stage,
  events,
  isLast,
}: {
  stage: ChainStage;
  events: TimelineEvent[];
  isLast: boolean;
}) {
  const worstSeverity = events.reduce(
    (worst, e) => (SEVERITY_RANK[e.severity] > SEVERITY_RANK[worst] ? e.severity : worst),
    'info' as Severity,
  );

  return (
    <li className="relative flex gap-4 pb-4 last:pb-0">
      {!isLast && <span aria-hidden className="absolute left-[11px] top-7 h-full w-px bg-line" />}
      <span className={`z-10 mt-2 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-canvas-elevated ${severityDot[worstSeverity]}`} />
      <div className={`min-w-0 flex-1 rounded-xl border px-4 py-3 ${severityBorder[worstSeverity]}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${severityText[worstSeverity]}`}>
            {chainStageLabel[stage]}
          </span>
          {events.some((e) => e.severity === 'critical') && (
            <StatusPill status="warn" label="Critical" />
          )}
          <span className="ml-auto text-[11px] text-ink-faint">
            {events.length} event{events.length === 1 ? '' : 's'}
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {events.map((ev, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot[ev.severity]}`} />
              <div className="min-w-0">
                <span className={`break-words ${severityText[ev.severity]}`}>{ev.what}</span>
                <span className="ml-2 text-ink-faint">
                  {ev.source}
                  {ev.at ? ` · ${new Date(ev.at).toLocaleTimeString()}` : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

function BlastSummary({ radius }: { radius: BlastRadius }) {
  if (radius.findings.length === 0) return null;

  return (
    <div className={`mt-4 rounded-xl border px-4 py-3 ${severityBorder[radius.worst]}`}>
      <p className={`text-sm font-semibold ${severityText[radius.worst]}`}>{radius.headline}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary break-words">{radius.summary}</p>
      <ul className="mt-3 space-y-1.5">
        {radius.findings.slice(0, 5).map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px]">
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot[f.severity]}`} />
            <span className="min-w-0 break-words">
              <span className={severityText[f.severity]}>{f.label}</span>
              <span className="text-ink-muted"> - {f.impact}</span>
            </span>
          </li>
        ))}
      </ul>
      {radius.findings.length > 5 && (
        <p className="mt-2 text-[11px] text-ink-faint">
          + {radius.findings.length - 5} more finding{radius.findings.length - 5 > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

function LegacyNode({ node, isLast }: { node: ExecutionNode; isLast: boolean }) {
  return (
    <li className="relative flex gap-4 pb-4 last:pb-0">
      {!isLast && (
        <span
          aria-hidden
          className={`absolute left-[11px] top-7 h-full w-px ${node.confirmed ? 'bg-state-ok/40' : 'bg-line'}`}
        />
      )}
      <span
        className={`z-10 mt-2 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-canvas-elevated ${severityDot[node.severity]} ${
          node.confirmed ? 'animate-pulse-soft' : ''
        }`}
      />
      <div className={`min-w-0 flex-1 rounded-xl border px-4 py-3 ${severityBorder[node.severity]}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${severityText[node.severity]}`}>
            {node.stage}
          </span>
          <StatusPill
            status={node.confirmed ? 'online' : 'offline'}
            label={node.confirmed ? 'Confirmed' : 'Unverified'}
          />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary break-words">{node.description}</p>
        <p className="mt-2 text-[11px] text-ink-faint">
          Source: {node.source}
          {node.indicator ? ` · ${node.indicator}` : ''}
        </p>
      </div>
    </li>
  );
}

export function ExecutionGraph({
  campaignId,
  capturesByScenario = {},
}: {
  campaignId: string;
  capturesByScenario?: Record<string, Record<string, unknown>>;
}) {
  const [nodes, setNodes] = useState<ExecutionNode[]>([]);
  const [campaign, setCampaign] = useState<CampaignSummary | null>(null);
  const [chain, setChain] = useState<Array<{ stage: ChainStage; events: TimelineEvent[] }>>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [blastRadius, setBlastRadius] = useState<BlastRadius | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const capturesKey = JSON.stringify(capturesByScenario);

  const loadGraph = useCallback(async () => {
    try {
      const captures = JSON.parse(capturesKey) as Record<string, Record<string, unknown>>;
      const result = await campaignApi.getExecGraph(campaignId, captures);
      setNodes(result.nodes || []);
      setCampaign(result.campaign || null);

      const stitched = stitchTimeline(captures);
      setTimelineEvents(stitched);
      setChain(buildChain(stitched));

      const combinedCaptures: Record<string, unknown> = {};
      for (const cap of Object.values(captures)) {
        Object.assign(combinedCaptures, cap);
      }
      setBlastRadius(analyzeBlastRadius(combinedCaptures));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load execution graph');
    } finally {
      setLoading(false);
    }
  }, [campaignId, capturesKey]);

  useEffect(() => {
    void loadGraph();
    intervalRef.current = setInterval(() => void loadGraph(), 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadGraph]);

  if (loading) {
    return <p className="text-sm text-ink-muted">Building execution graph…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-state-error/30 bg-state-error/10 px-4 py-3 text-sm text-state-error">
        Graph error: {error}
      </div>
    );
  }

  const confirmedCount = nodes.filter((n) => n.confirmed).length;
  const scenarioCount = Object.keys(JSON.parse(capturesKey) as object).length;

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        {campaign && (
          <span>
            {campaign.title} · {campaign.chapters.length} chapters
          </span>
        )}
        {confirmedCount > 0 && (
          <StatusPill status="online" label={`${confirmedCount}/${nodes.length} confirmed`} />
        )}
        {chain.length > 0 && <span>{chain.length} live stages</span>}
        {scenarioCount > 1 && timelineEvents.length > 0 && (
          <span className="text-brand">
            {timelineEvents.length} events across {scenarioCount} labs
          </span>
        )}
      </div>

      {chain.length > 0 ? (
        <ol className="space-y-0">
          {chain.map((stageGroup, i) => (
            <ChainStageNode
              key={stageGroup.stage}
              stage={stageGroup.stage}
              events={stageGroup.events}
              isLast={i === chain.length - 1}
            />
          ))}
        </ol>
      ) : (
        <ol className="space-y-0">
          {nodes.map((node, i) => (
            <LegacyNode key={`${node.stage}-${i}`} node={node} isLast={i === nodes.length - 1} />
          ))}
        </ol>
      )}

      {blastRadius && blastRadius.findings.length > 0 && <BlastSummary radius={blastRadius} />}
    </div>
  );
}

export default ExecutionGraph;
