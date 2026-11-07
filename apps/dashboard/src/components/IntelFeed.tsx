'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { campaign as campaignApi, cp } from '@/lib/api';

/* ── Types ─────────────────────────────────────────────────────────────────── */

type InjectKind = 'intel-brief' | 'alert';

interface CampaignEvidence {
  type: string;
  [key: string]: unknown;
}

interface CampaignInject {
  id: string;
  when: string;
  kind: InjectKind;
  timestamp: string;
  from: string;
  subject: string;
  body: string;
  evidence?: CampaignEvidence[];
  confidence: number;
}

interface CampaignSummary {
  id: string;
  title: string;
  persona: string;
  tagline: string;
  chapterCount: number;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const kindIcon: Record<InjectKind, string> = {
  'intel-brief': '📡',
  alert: '🚨',
};

const kindBadge: Record<InjectKind, { label: string; color: string }> = {
  'intel-brief': { label: 'Intel Brief', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  alert: { label: 'SOC Alert', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

function confidenceColor(c: number): string {
  if (c >= 0.9) return 'text-green-400';
  if (c >= 0.7) return 'text-yellow-400';
  return 'text-gray-400';
}

/* ── Components ────────────────────────────────────────────────────────────── */

function InjectCard({ inject }: { inject: CampaignInject }) {
  const badge = kindBadge[inject.kind];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative rounded-lg border border-gray-700/60 bg-gray-900/60 p-4 hover:border-gray-600 transition-colors">
      {/* Timeline dot and line */}
      <div className="absolute -left-8 top-0 bottom-0 w-px bg-gray-700" />
      <div className="absolute -left-[15px] top-4 h-2.5 w-2.5 rounded-full bg-gray-500 ring-4 ring-gray-900" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label={inject.kind}>{kindIcon[inject.kind]}</span>
          <span className="text-xs font-mono text-gray-500">{inject.id}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider border ${badge.color}`}>
            {badge.label}
          </span>
          <span className={`text-xs font-mono ${confidenceColor(inject.confidence)}`}>
            {(inject.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Subject & metadata */}
      <div className="mt-2">
        <h4 className="text-sm font-semibold text-gray-100">{inject.subject}</h4>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          <span>{inject.from}</span>
          <span>·</span>
          <span>{new Date(inject.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
      </div>

      {/* Body */}
      <p className="mt-3 text-sm leading-relaxed text-gray-400">{inject.body}</p>

      {/* Evidence toggle */}
      {inject.evidence && inject.evidence.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
            type="button"
          >
            {expanded ? '▾' : '▸'} {inject.evidence.length} evidence artifact{inject.evidence.length > 1 ? 's' : ''}
          </button>
          {expanded && (
            <div className="mt-2 space-y-2">
              {inject.evidence.map((ev, i) => (
                <div key={i} className="rounded border border-gray-700/50 bg-gray-800/40 p-3 font-mono text-[11px] text-gray-300 overflow-x-auto">
                  <div className="text-gray-500 mb-1">[{ev.type}]</div>
                  {Object.entries(ev as Record<string, unknown>)
                    .filter(([k]) => k !== 'type')
                    .map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-gray-500 shrink-0">{k}:</span>
                        <span className="text-gray-300 break-all">{String(v)}</span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IntelFeed({ campaignId, completedScenarios = [] }: { campaignId: string; completedScenarios?: string[] }) {
  const [injects, setInjects] = useState<CampaignInject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadInjects = useCallback(async () => {
    try {
      const result = await campaignApi.getInjects(campaignId, completedScenarios);
      setInjects(result.injects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load intel feed');
    } finally {
      setLoading(false);
    }
  }, [campaignId, completedScenarios]);

  useEffect(() => {
    loadInjects();
    // Auto-refresh every 10s so injects arrive as learner completes chapters
    intervalRef.current = setInterval(loadInjects, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadInjects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-gray-500">Loading intel feed…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4 text-sm text-red-300">
        Intel feed error: {error}
      </div>
    );
  }

  if (injects.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700/40 bg-gray-800/20 p-6 text-center">
        <p className="text-sm text-gray-500">No intel events yet. Complete campaign chapters to unlock intelligence.</p>
      </div>
    );
  }

  // Sort by timestamp descending (newest first)
  const sorted = [...injects].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-lg">📡</span>
        <h3 className="text-base font-semibold text-gray-100">Living Intel Feed</h3>
        <span className="ml-auto text-xs font-mono text-gray-500">{sorted.length} event{sorted.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="relative space-y-6 pl-8">
        {/* Vertical timeline line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/30 via-blue-500/20 to-transparent" />
        {sorted.map((inj) => (
          <InjectCard key={inj.id} inject={inj} />
        ))}
      </div>
    </div>
  );
}

/* ── Campaign Selector ─────────────────────────────────────────────────────── */

function CampaignSelector({ onSelect }: { onSelect: (id: string) => void }) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cp.getCampaigns()
      .then((data) => setCampaigns(data.map((c) => ({
        id: c.id,
        title: c.title,
        persona: c.persona,
        tagline: c.tagline,
        chapterCount: c.totalChapters,
      }))))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <div className="mb-6">
      <label className="block text-xs font-medium text-gray-400 mb-2">Campaign</label>
      <select
        className="w-full rounded-md border border-gray-700 bg-gray-800 text-sm text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        value={campaigns[0]?.id ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={campaigns.length <= 1}
      >
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>{c.title} ({c.chapterCount} chapters)</option>
        ))}
      </select>
    </div>
  );
}

/* ── Entry Point ───────────────────────────────────────────────────────────── */

export function IntelFeedPanel({ campaignId, completedScenarios }: { campaignId: string; completedScenarios?: string[] }) {
  const [selected, setSelected] = useState(campaignId);

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-900/40 p-5">
      <CampaignSelector onSelect={(id) => setSelected(id)} />
      <IntelFeed campaignId={selected} completedScenarios={completedScenarios || []} />
    </div>
  );
}

export default IntelFeedPanel;
