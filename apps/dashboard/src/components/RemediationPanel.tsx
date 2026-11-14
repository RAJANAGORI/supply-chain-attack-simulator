'use client';

import { useState, useEffect, useCallback } from 'react';
import { campaign as campaignApi } from '@/lib/api';
import { StatusPill } from '@/components/ui';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface RemediationItem {
  id: string;
  title: string;
  severity: Severity;
  weight: number;
  description: string;
  steps: string[];
  flag: string;
}

interface RemediationGrade {
  totalPossible: number;
  earned: number;
  percentage: number;
  completedIds: string[];
  missingIds: string[];
}

const severityPill: Record<Severity, 'online' | 'offline' | 'busy' | 'warn'> = {
  critical: 'warn',
  high: 'warn',
  medium: 'busy',
  low: 'busy',
  info: 'offline',
};

function GradeBadge({ grade }: { grade: RemediationGrade | null }) {
  if (!grade) {
    return <StatusPill status="offline" label="Not graded yet" />;
  }

  const status = grade.percentage >= 80 ? 'online' : grade.percentage >= 50 ? 'busy' : 'warn';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-2xl font-semibold tabular-nums text-ink-primary">{grade.percentage}%</span>
      <div className="text-xs text-ink-muted">
        <div>
          {grade.earned}/{grade.totalPossible} points
        </div>
        <StatusPill
          status={status}
          label={`${grade.completedIds.length} done · ${grade.missingIds.length} left`}
        />
      </div>
    </div>
  );
}

function RemediationCard({
  item,
  completed,
  onToggle,
}: {
  item: RemediationItem;
  completed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 transition ${
        completed
          ? 'border-state-ok/30 bg-state-ok/5'
          : 'border-line bg-canvas-hover/30 hover:border-line-strong'
      }`}
      onClick={onToggle}
      role="checkbox"
      aria-checked={completed}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
            completed
              ? 'border-state-ok bg-state-ok text-white'
              : 'border-line hover:border-ink-muted'
          }`}
        >
          {completed && (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={`text-sm font-medium break-words ${
                completed ? 'text-state-ok line-through' : 'text-ink-primary'
              }`}
            >
              {item.title}
            </h4>
            <StatusPill status={severityPill[item.severity]} label={item.severity} />
            <span className="text-[10px] text-ink-faint">+{item.weight} pts</span>
          </div>

          <p className="mt-1 text-xs leading-relaxed text-ink-muted break-words">{item.description}</p>

          <ul className="mt-2 space-y-1">
            {item.steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-ink-faint">
                <span className="shrink-0" aria-hidden>
                  ·
                </span>
                <span className={`min-w-0 break-words ${completed ? 'line-through opacity-50' : ''}`}>
                  {step}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function RemediationPanel({ campaignId }: { campaignId: string }) {
  const [items, setItems] = useState<RemediationItem[]>([]);
  const [grade, setGrade] = useState<RemediationGrade | null>(null);
  const [loading, setLoading] = useState(true);

  const [completedFlags, setCompletedFlags] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`campaign-${campaignId}-remediation`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const loadRemediation = useCallback(
    async (flags: string[]) => {
      try {
        const result = await campaignApi.getRemediation(campaignId, flags);
        setItems(result.items || []);
        setGrade(result.grade || null);
      } catch {
        /* empty state */
      } finally {
        setLoading(false);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    void loadRemediation(completedFlags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, loadRemediation]);

  const toggleItem = (flag: string) => {
    const next = completedFlags.includes(flag)
      ? completedFlags.filter((f) => f !== flag)
      : [...completedFlags, flag];
    setCompletedFlags(next);
    try {
      localStorage.setItem(`campaign-${campaignId}-remediation`, JSON.stringify(next));
    } catch {
      /* storage full */
    }
    void loadRemediation(next);
  };

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading remediation checklist…</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-ink-muted">No remediation items defined for this campaign.</p>;
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">Tick items off as you close the gaps this actor used.</p>
        <GradeBadge grade={grade} />
      </div>

      {grade && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas-hover">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              grade.percentage >= 80
                ? 'bg-state-ok'
                : grade.percentage >= 50
                  ? 'bg-state-warn'
                  : 'bg-state-error'
            }`}
            style={{ width: `${grade.percentage}%` }}
          />
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <RemediationCard
            key={item.id}
            item={item}
            completed={completedFlags.includes(item.flag)}
            onToggle={() => toggleItem(item.flag)}
          />
        ))}
      </div>
    </div>
  );
}

export default RemediationPanel;
