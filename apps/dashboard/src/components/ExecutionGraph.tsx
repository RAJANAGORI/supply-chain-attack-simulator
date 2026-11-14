'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { campaign as campaignApi } from '@/lib/api';
import { StatusPill } from '@/components/ui';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface ExecutionNode {
  stage: string;
  description: string;
  severity: Severity;
  source: string;
  confirmed: boolean;
  indicator?: string;
}

/**
 * Campaign attack chain: one row per chapter, in order.
 * Confirmed when that lab's captures show exfil. No second "INSTALL/EXFIL"
 * reinterpretation layer - that was crowding the section into noise.
 */
export function ExecutionGraph({
  campaignId,
  capturesByScenario = {},
}: {
  campaignId: string;
  capturesByScenario?: Record<string, Record<string, unknown>>;
}) {
  const [nodes, setNodes] = useState<ExecutionNode[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stable key so empty `{}` every parent render does not thrash the poller.
  const capturesKey = useMemo(
    () => JSON.stringify(capturesByScenario),
    [capturesByScenario],
  );

  const loadGraph = useCallback(async () => {
    try {
      const captures = JSON.parse(capturesKey) as Record<string, Record<string, unknown>>;
      const result = await campaignApi.getExecGraph(campaignId, captures);
      setNodes(result.nodes || []);
      setTitle(result.campaign?.title ?? '');
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

  if (nodes.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-canvas-hover/30 px-4 py-5 text-center text-sm text-ink-muted">
        No chapters in this campaign yet.
      </p>
    );
  }

  const confirmedCount = nodes.filter((n) => n.confirmed).length;

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        {title && (
          <span>
            {title} · {nodes.length} chapter{nodes.length === 1 ? '' : 's'}
          </span>
        )}
        <StatusPill
          status={confirmedCount > 0 ? 'online' : 'offline'}
          label={`${confirmedCount}/${nodes.length} confirmed by captures`}
        />
      </div>

      <ol className="space-y-0">
        {nodes.map((node, i) => {
          const last = i === nodes.length - 1;
          return (
            <li key={`${node.source}-${node.stage}`} className="relative flex gap-4 pb-5 last:pb-0">
              {!last && (
                <span
                  aria-hidden
                  className={`absolute left-[15px] top-8 h-full w-px ${
                    node.confirmed ? 'bg-state-ok/40' : 'bg-line'
                  }`}
                />
              )}
              <span
                className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  node.confirmed
                    ? 'border-state-ok/40 bg-state-ok/15 text-state-ok'
                    : 'border-line bg-canvas-hover text-ink-faint'
                }`}
              >
                {node.confirmed ? '✓' : i + 1}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
                    {node.stage}
                  </span>
                  <StatusPill
                    status={node.confirmed ? 'online' : 'offline'}
                    label={node.confirmed ? 'Confirmed' : 'Unverified'}
                  />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary break-words">
                  {node.description}
                </p>
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  {node.source}
                  {node.indicator ? ` · ${node.indicator}` : ''}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default ExecutionGraph;
