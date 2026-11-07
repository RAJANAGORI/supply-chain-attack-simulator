'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { campaign as campaignApi } from '@/lib/api';

/* ── Types ─────────────────────────────────────────────────────────────────── */

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface ExecutionNode {
  stage: string;
  description: string;
  severity: Severity;
  source: string;
  confirmed: boolean;
  indicator?: string;
}

interface CampaignSummary {
  id: string;
  title: string;
  chapters: Array<{ scenario: string; beat: string; narrative: string }>;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const severityStyles: Record<Severity, { bg: string; border: string; text: string; dot: string }> = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-500' },
  high:     { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-500' },
  medium:   { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  low:      { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-500' },
  info:     { bg: 'bg-gray-500/5', border: 'border-gray-600/30', text: 'text-gray-500', dot: 'bg-gray-500' },
};

const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

/* ── Components ────────────────────────────────────────────────────────────── */

function ChainNode({ node, isLast }: { node: ExecutionNode; isLast: boolean }) {
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

export function ExecutionGraph({
  campaignId,
  capturesByScenario = {},
}: {
  campaignId: string;
  capturesByScenario?: Record<string, Record<string, unknown>>;
}) {
  const [nodes, setNodes] = useState<ExecutionNode[]>([]);
  const [campaign, setCampaign] = useState<CampaignSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadGraph = useCallback(async () => {
    try {
      const result = await campaignApi.getExecGraph(campaignId, capturesByScenario);
      setNodes(result.nodes || []);
      setCampaign(result.campaign || null);
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
          {nodes.filter((n) => n.confirmed).length > 0 && (
            <span className="text-xs font-medium text-green-400">
              {nodes.filter((n) => n.confirmed).length}/{nodes.length} confirmed
            </span>
          )}
        </div>
      </div>

      {/* Chain visualization */}
      <div className="space-y-0">
        {nodes.map((node, i) => (
          <ChainNode key={i} node={node} isLast={i === nodes.length - 1} />
        ))}
      </div>

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

export default ExecutionGraph;
