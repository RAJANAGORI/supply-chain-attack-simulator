'use client';

import { useState, useEffect, useCallback } from 'react';
import { campaign as campaignApi } from '@/lib/api';

/* ── Types ─────────────────────────────────────────────────────────────────── */

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

/* ── Helpers ───────────────────────────────────────────────────────────────── */

const severityStyles: Record<Severity, { bg: string; border: string; text: string; dot: string }> = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-500' },
  high:     { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-500' },
  medium:   { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  low:      { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-500' },
  info:     { bg: 'bg-gray-500/5', border: 'border-gray-600/30', text: 'text-gray-500', dot: 'bg-gray-500' },
};

/* ── Components ────────────────────────────────────────────────────────────── */

function GradeBadge({ grade }: { grade: RemediationGrade | null }) {
  if (!grade) {
    return (
      <span className="rounded-full bg-gray-600/20 px-3 py-1 text-xs text-gray-400 border border-gray-600/30">
        Not graded yet
      </span>
    );
  }

  const color =
    grade.percentage >= 80 ? 'text-green-400' :
    grade.percentage >= 50 ? 'text-yellow-400' :
    'text-red-400';

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center">
        <span className={`text-2xl font-bold ${color}`}>{grade.percentage}%</span>
        <span className="text-[10px] text-gray-500">remediation grade</span>
      </div>
      <div className="h-8 w-px bg-gray-700" />
      <div className="text-xs text-gray-400">
        <div>{grade.earned}/{grade.totalPossible} points</div>
        <div className={color}>
          {grade.completedIds.length} done · {grade.missingIds.length} remaining
        </div>
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
  const styles = severityStyles[item.severity];

  return (
    <div
      className={`rounded-lg border ${completed ? 'border-green-500/30 bg-green-500/5' : styles.border} ${styles.bg} p-4 transition-all cursor-pointer hover:border-opacity-60`}
      onClick={onToggle}
      role="checkbox"
      aria-checked={completed}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(); } }}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          completed
            ? 'bg-green-500 border-green-500'
            : 'border-gray-600 hover:border-gray-500'
        }`}>
          {completed && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-semibold ${completed ? 'text-green-300 line-through' : 'text-gray-200'}`}>
              {item.title}
            </h4>
            <span className={`text-[10px] font-medium uppercase tracking-wider ${styles.text}`}>
              {item.severity}
            </span>
            <span className="text-[10px] text-gray-500">+{item.weight} pts</span>
          </div>

          <p className="mt-1 text-xs text-gray-400">{item.description}</p>

          <div className="mt-2 space-y-1">
            {item.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="text-gray-600 mt-0.5">▸</span>
                <span className={completed ? 'line-through opacity-50' : ''}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RemediationPanel({ campaignId }: { campaignId: string }) {
  const [items, setItems] = useState<RemediationItem[]>([]);
  const [grade, setGrade] = useState<RemediationGrade | null>(null);
  const [loading, setLoading] = useState(true);

  // Track which flags are completed (loaded from localStorage or server)
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
        // Silently fail - panel shows empty state
      } finally {
        setLoading(false);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    void loadRemediation(completedFlags);
    // Only re-fetch when the campaign changes; toggles call loadRemediation with the next flags.
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
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-5 w-5 border-2 border-green-400 border-t-transparent rounded-full" />
        <span className="ml-3 text-sm text-gray-500">Loading remediation checklist…</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700/50 bg-gray-900/40 p-5">
        <p className="text-sm text-gray-500">No remediation items defined for this campaign.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-900/40 p-5">
      {/* Header with grade */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-lg">✅</span>
          <div>
            <h3 className="text-base font-semibold text-gray-100">Remediation Checklist</h3>
            <p className="text-xs text-gray-500 mt-0.5">Complete all items to achieve full grade</p>
          </div>
        </div>
        <GradeBadge grade={grade} />
      </div>

      {/* Grade progress bar */}
      {grade && (
        <div className="mb-6">
          <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                grade.percentage >= 80 ? 'bg-green-500' :
                grade.percentage >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${grade.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist */}
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
