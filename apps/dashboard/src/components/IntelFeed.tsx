'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { campaign as campaignApi, cp } from '@/lib/api';
import { StatusPill } from '@/components/ui';

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

function InjectCard({ inject, isLast }: { inject: CampaignInject; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isAlert = inject.kind === 'alert';

  return (
    <li className="relative flex gap-4 pb-5 last:pb-0">
      {!isLast && (
        <span
          aria-hidden
          className={`absolute left-[11px] top-7 h-[calc(100%-1.25rem)] w-px ${
            isAlert ? 'bg-state-error/35' : 'bg-line'
          }`}
        />
      )}
      <span
        className={`z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-canvas-elevated ${
          isAlert ? 'bg-state-error' : 'bg-brand'
        }`}
      />
      <div className="min-w-0 flex-1 rounded-xl border border-line bg-canvas-hover/40 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill
            status={isAlert ? 'warn' : 'busy'}
            label={isAlert ? 'SOC alert' : 'Intel brief'}
          />
          <span className="font-mono text-[10px] text-ink-faint">{inject.id}</span>
          <span className="ml-auto font-mono text-[11px] text-ink-muted">
            {Math.round(inject.confidence * 100)}% conf
          </span>
        </div>
        <h4 className="mt-2 text-sm font-medium leading-snug text-ink-primary break-words">
          {inject.subject}
        </h4>
        <p className="mt-1 text-[11px] text-ink-faint">
          {inject.from}
          <span className="mx-1.5" aria-hidden>
            ·
          </span>
          {new Date(inject.timestamp).toLocaleString('en-US', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary break-words">{inject.body}</p>

        {inject.evidence && inject.evidence.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-medium text-brand hover:text-brand-light"
            >
              {expanded ? 'Hide' : 'Show'} {inject.evidence.length} evidence artifact
              {inject.evidence.length > 1 ? 's' : ''}
            </button>
            {expanded && (
              <div className="mt-2 space-y-2">
                {inject.evidence.map((ev, i) => (
                  <div
                    key={i}
                    className="overflow-x-auto rounded-lg border border-line bg-canvas p-3 font-mono text-[11px] text-ink-secondary"
                  >
                    <div className="mb-1 text-ink-faint">[{ev.type}]</div>
                    {Object.entries(ev as Record<string, unknown>)
                      .filter(([k]) => k !== 'type')
                      .map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="shrink-0 text-ink-faint">{k}:</span>
                          <span className="min-w-0 break-all">{String(v)}</span>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function IntelFeed({
  campaignId,
  completedScenarios = [],
}: {
  campaignId: string;
  completedScenarios?: string[];
}) {
  const [injects, setInjects] = useState<CampaignInject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadInjects = useCallback(async () => {
    try {
      const result = await campaignApi.getInjects(campaignId, completedScenarios);
      setInjects(result.injects || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load intel feed');
    } finally {
      setLoading(false);
    }
  }, [campaignId, completedScenarios]);

  useEffect(() => {
    void loadInjects();
    intervalRef.current = setInterval(() => void loadInjects(), 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadInjects]);

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading intel feed…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-state-error/30 bg-state-error/10 px-4 py-3 text-sm text-state-error">
        Intel feed error: {error}
      </div>
    );
  }

  if (injects.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-canvas-hover/30 px-4 py-5 text-center text-sm text-ink-muted">
        No intel events yet. Complete campaign chapters to unlock intelligence.
      </p>
    );
  }

  const sorted = [...injects].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div>
      <p className="mb-3 text-[11px] text-ink-faint">
        {sorted.length} event{sorted.length === 1 ? '' : 's'} unlocked
      </p>
      <ol className="space-y-0">
        {sorted.map((inj, i) => (
          <InjectCard key={inj.id} inject={inj} isLast={i === sorted.length - 1} />
        ))}
      </ol>
    </div>
  );
}

function CampaignSelector({ onSelect }: { onSelect: (id: string) => void }) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cp.getCampaigns()
      .then((data) =>
        setCampaigns(
          data.map((c) => ({
            id: c.id,
            title: c.title,
            persona: c.persona,
            tagline: c.tagline,
            chapterCount: c.totalChapters,
          })),
        ),
      )
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || campaigns.length === 0) return null;

  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-medium text-ink-muted">Campaign</label>
      <select
        className="w-full rounded-lg border border-line bg-canvas-elevated px-3 py-2 text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/40"
        value={campaigns[0]?.id ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={campaigns.length <= 1}
      >
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title} ({c.chapterCount} chapters)
          </option>
        ))}
      </select>
    </div>
  );
}

export function IntelFeedPanel({
  campaignId,
  completedScenarios,
  showSelector = false,
}: {
  campaignId: string;
  completedScenarios?: string[];
  /** When false (default), lock to the given campaignId - used on /campaign cards. */
  showSelector?: boolean;
}) {
  const [selected, setSelected] = useState(campaignId);

  useEffect(() => {
    setSelected(campaignId);
  }, [campaignId]);

  const activeId = showSelector ? selected : campaignId;

  return (
    <div className="min-w-0">
      {showSelector && <CampaignSelector onSelect={(id) => setSelected(id)} />}
      <IntelFeed campaignId={activeId} completedScenarios={completedScenarios || []} />
    </div>
  );
}

export default IntelFeedPanel;
