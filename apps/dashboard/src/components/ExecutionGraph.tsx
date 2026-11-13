'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { campaign as campaignApi } from '@/lib/api';
import {
  analyzeBlastRadius,
  reconstructTimeline,
  type BlastFinding,
  type BlastRadius,
  type TimelineEvent,
} from '@/lib/blast-radius';

/* ── Types ─────────────────────────────────────────────────────────────────── */

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
type ChainStage = 'install' | 'lifecycle' | 'exfil' | 'persist' | 'discover';

interface ExecutionNode {
  stage: string;
  description: string;
  severity: Severity;
  source: string;
  confirmed: boolean;
  indicator?: string;
  /** Which chain stage this belongs to. */
  chainStage?: ChainStage;
}

interface CampaignSummary {
  id: string;
  title: string;
  chapters: Array<{ scenario: string; beat: string; narrative: string }>;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const severityStyles: Record<Severity, { bg: string; border: string; text: string; dot: string; glow: string }> = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-500', glow: 'shadow-red-500/20' },
  high:     { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-500', glow: 'shadow-orange-500/20' },
  medium:   { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-500', glow: 'shadow-yellow-500/20' },
  low:      { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-500', glow: 'shadow-blue-500/20' },
  info:     { bg: 'bg-gray-500/5', border: 'border-gray-600/30', text: 'text-gray-500', dot: 'bg-gray-500', glow: '' },
};

const chainStageOrder: Record<ChainStage, number> = {
  discover: 0,
  install: 1,
  lifecycle: 2,
  exfil: 3,
  persist: 4,
};

const chainStageLabel: Record<ChainStage, string> = {
  discover: '🔍 Discover',
  install: '📦 Install',
  lifecycle: '⚙️ Lifecycle',
  exfil: '📡 Exfil',
  persist: '🔒 Persist',
};

/** Stitch TimelineEvents from multiple scenarios into a single ordered chain. */
function stitchTimeline(
  capturesByScenario: Record<string, Record<string, unknown>>,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const [scenarioId, captures] of Object.entries(capturesByScenario)) {
    const timeline = reconstructTimeline(captures, scenarioId);
    events.push(...timeline);
  }

  // Sort by timestamp; null at the end
  events.sort((a, b) => {
    if (!a.at && !b.at) return 0;
    if (!a.at) return 1;
    if (!b.at) return -1;
    return a.at.localeCompare(b.at);
  });

  return events;
}

/** Classify a timeline event into a chain stage based on its content. */
function classifyStage(event: TimelineEvent): ChainStage {
  const w = event.what.toLowerCase();
  if (w.includes('exfil') || w.includes('fetch') || w.includes('POST') || w.includes('http') || w.includes('phoning') || w.includes('beacon')) return 'exfil';
  if (w.includes('install') || w.includes('import') || w.includes('require') || w.includes('npm') || w.includes('pull') || w.includes('fetch') && !w.includes('http')) return 'install';
  if (w.includes('hook') || w.includes('postinstall') || w.includes('lifecycle') || w.includes('script')) return 'lifecycle';
  if (w.includes('env') || w.includes('discover') || w.includes('enum') || w.includes('recon') || w.includes('probe')) return 'discover';
  if (w.includes('persist') || w.includes('registry') || w.includes('mirror')) return 'persist';
  return 'install';
}

/** Build a directed chain from classified events, grouping by stage. */
function buildChain(events: TimelineEvent[]): Array<{ stage: ChainStage; events: TimelineEvent[] }> {
  const grouped = new Map<ChainStage, TimelineEvent[]>();
  for (const e of events) {
    const stage = classifyStage(e);
    if (!grouped.has(stage)) grouped.set(stage, []);
    grouped.get(stage)!.push(e);
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => chainStageOrder[a] - chainStageOrder[b])
    .map(([stage, events]) => ({ stage, events }));
}

/* ── Edge Rendering ────────────────────────────────────────────────────────── */

function ChainEdge({
  from,
  to,
  active,
}: {
  from: ChainStage;
  to: ChainStage;
  active: boolean;
}) {
  const arrowStyle = active
    ? 'stroke-green-400/60'
    : 'stroke-gray-700/40';
  return (
    <div className="flex items-center justify-center py-1">
      <svg width="24" height="48" viewBox="0 0 24 48" className="overflow-visible">
        {/* Vertical line */}
        <line x1="12" y1="0" x2="12" y2="40" className={arrowStyle} strokeWidth="2" strokeDasharray={active ? 'none' : '4 3'} />
        {/* Arrow head */}
        <polygon points="8,36 16,36 12,46" className={active ? 'fill-green-400/60' : 'fill-gray-700/40'} />
      </svg>
    </div>
  );
}

/* ── Chain Stage Node ──────────────────────────────────────────────────────── */

function ChainStageNode({
  stage,
  events,
  isLast,
  blastRadius,
}: {
  stage: ChainStage;
  events: TimelineEvent[];
  isLast: boolean;
  blastRadius?: BlastRadius;
}) {
  const worstSeverity = events.length > 0
    ? events.reduce((worst, e) => SEVERITY_RANK[e.severity] > SEVERITY_RANK[worst] ? e.severity : worst, 'info' as Severity)
    : 'info';
  const styles = severityStyles[worstSeverity];
  const hasCritical = events.some(e => e.severity === 'critical');

  return (
    <div className="relative">
      <div className={`rounded-xl border ${styles.border} ${styles.bg} p-4 shadow-lg ${styles.glow}`}>
        {/* Stage header */}
        <div className="flex items-center gap-3">
          <span className="text-lg">{chainStageLabel[stage].split(' ')[0]}</span>
          <span className={`text-sm font-bold uppercase tracking-wider ${styles.text}`}>
            {chainStageLabel[stage].split(' ').slice(1).join(' ')}
          </span>
          {hasCritical && (
            <span className="rounded-full bg-red-500/20 text-[10px] font-medium text-red-400 px-2 py-0.5 border border-red-500/30 animate-pulse">
              CRITICAL
            </span>
          )}
          <span className="ml-auto text-xs text-gray-500">{events.length} event{events.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Events list */}
        <ul className="mt-3 space-y-2">
          {events.map((ev, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px]">
              <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${severityStyles[ev.severity].dot}`} />
              <div>
                <span className={severityStyles[ev.severity].text}>{ev.what}</span>
                <span className="ml-2 text-xs text-gray-600">
                  {ev.source}
                  {ev.at ? ` · ${new Date(ev.at).toLocaleTimeString()}` : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Connector to next stage */}
      {!isLast && (
        <ChainEdge from={stage} to={'install' as ChainStage} active={true} />
      )}
    </div>
  );
}

/* ── Floci Stitching Indicator ─────────────────────────────────────────────── */

function FlociBadge({ eventCount, scenarioCount }: { eventCount: number; scenarioCount: number }) {
  if (scenarioCount <= 1) return null;
  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-brand/20 bg-brand/10 px-3 py-1.5 text-[11px] text-brand/80">
      <span className="text-xs">✦</span>
      <span>
        <strong>Floci stitched:</strong> {eventCount} events across {scenarioCount} scenario{scenarioCount > 1 ? 's' : ''}
      </span>
    </div>
  );
}

/* ── Blast Finding Summary ─────────────────────────────────────────────────── */

function BlastSummary({ radius }: { radius: BlastRadius }) {
  if (radius.findings.length === 0) return null;

  return (
    <div className={`mt-4 rounded-xl border p-4 ${
      radius.worst === 'critical'
        ? 'border-red-500/30 bg-red-500/10'
        : radius.worst === 'high'
          ? 'border-orange-500/30 bg-orange-500/10'
          : 'border-yellow-500/30 bg-yellow-500/10'
    }`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{radius.worst === 'critical' ? '🚨' : radius.worst === 'high' ? '⚠️' : '🔔'}</span>
        <span className={`text-sm font-bold ${severityStyles[radius.worst].text}`}>
          {radius.headline}
        </span>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-gray-300">{radius.summary}</p>

      <ul className="mt-3 space-y-1.5">
        {radius.findings.slice(0, 5).map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px]">
            <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${severityStyles[f.severity].dot}`} />
            <span>
              <span className={severityStyles[f.severity].text}>{f.label}</span>
              {' '}— {f.impact}
            </span>
          </li>
        ))}
      </ul>
      {radius.findings.length > 5 && (
        <p className="mt-2 text-[11px] text-gray-500">
          + {radius.findings.length - 5} more finding{radius.findings.length - 5 > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

/* ── Main Component ────────────────────────────────────────────────────────── */

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

  const loadGraph = useCallback(async () => {
    try {
      const result = await campaignApi.getExecGraph(campaignId, capturesByScenario);
      setNodes(result.nodes || []);
      setCampaign(result.campaign || null);

      // Stitch events from all scenarios into a unified timeline (Floci)
      const stitched = stitchTimeline(capturesByScenario);
      setTimelineEvents(stitched);

      // Build chain view from classified events
      const chainView = buildChain(stitched);
      setChain(chainView);

      // Analyze blast radius from raw captures
      const combinedCaptures: Record<string, unknown> = {};
      for (const captures of Object.values(capturesByScenario)) {
        Object.assign(combinedCaptures, captures);
      }
      setBlastRadius(analyzeBlastRadius(combinedCaptures));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load execution graph');
    } finally {
      setLoading(false);
    }
  }, [campaignId, capturesByScenario]);

  useEffect(() => {
    loadGraph();
    // Refresh every 10s to pick up new captures
    intervalRef.current = setInterval(loadGraph, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadGraph]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-5 w-5 border-2 border-orange-400 border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-gray-500">Building execution graph…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4 text-sm text-red-300">
        Graph error: {error}
      </div>
    );
  }

  const confirmedCount = nodes.filter(n => n.confirmed).length;

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-900/40 p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-lg">⛓️</span>
        <div>
          <h3 className="text-base font-semibold text-gray-100">Attack Chain</h3>
          {campaign && (
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              {campaign.title} — {campaign.chapters.length} chapters
            </p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {confirmedCount > 0 && (
            <span className="text-xs font-medium text-green-400">
              {confirmedCount}/{nodes.length} confirmed
            </span>
          )}
          {chain.length > 0 && (
            <span className="text-xs text-brand/80">
              {chain.length} stages
            </span>
          )}
        </div>
      </div>

      {/* Chain visualization with edges */}
      {chain.length > 0 ? (
        <div className="space-y-0">
          {chain.map((stageGroup, i) => (
            <ChainStageNode
              key={stageGroup.stage}
              stage={stageGroup.stage}
              events={stageGroup.events}
              isLast={i === chain.length - 1}
              blastRadius={blastRadius || undefined}
            />
          ))}
        </div>
      ) : (
        /* Fallback: legacy node list */
        <div className="space-y-0">
          {nodes.map((node, i) => (
            <LegacyNode key={i} node={node} isLast={i === nodes.length - 1} />
          ))}
        </div>
      )}

      {/* Floci indicator */}
      <FlociBadge eventCount={timelineEvents.length} scenarioCount={Object.keys(capturesByScenario).length} />

      {/* Blast radius summary */}
      {blastRadius && blastRadius.findings.length > 0 && (
        <BlastSummary radius={blastRadius} />
      )}

      {/* Legend */}
      <div className="mt-6 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Critical
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> High
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-500" /> Unconfirmed
        </span>
      </div>
    </div>
  );
}

/* Legacy fallback node renderer (when no chain data available) */
function LegacyNode({ node, isLast }: { node: ExecutionNode; isLast: boolean }) {
  const styles = severityStyles[node.severity];

  return (
    <div className="relative flex gap-4">
      {/* Connector line */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`h-6 w-px ${node.confirmed ? 'bg-gray-500' : 'bg-gray-700'}`} />
        <div
          className={`h-3 w-3 rounded-full ring-4 ring-gray-900 ${styles.dot} ${
            node.confirmed ? 'animate-pulse' : ''
          }`}
        />
        {!isLast && <div className={`h-12 w-px ${node.confirmed ? 'bg-gray-500' : 'bg-gray-700'}`} />}
      </div>

      {/* Content */}
      <div className={`flex-1 rounded-lg border ${styles.border} ${styles.bg} p-4`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-wider ${styles.text}`}>
            {node.stage}
          </span>
          {node.confirmed && (
            <span className="rounded-full bg-green-500/20 text-[10px] font-medium text-green-400 px-2 py-0.5 border border-green-500/30">
              CONFIRMED
            </span>
          )}
          {!node.confirmed && (
            <span className="rounded-full bg-gray-500/10 text-[10px] font-medium text-gray-500 px-2 py-0.5 border border-gray-600/20">
              UNVERIFIED
            </span>
          )}
        </div>

        <p className="mt-2 text-sm text-gray-300">{node.description}</p>

        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
          <span>Source: {node.source}</span>
          {node.indicator && (
            <>
              <span>·</span>
              <span className="font-mono text-gray-400">⚡ {node.indicator}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExecutionGraph;
