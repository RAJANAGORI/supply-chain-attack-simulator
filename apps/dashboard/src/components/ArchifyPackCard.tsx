'use client';

import { useEffect, useState } from 'react';
import { Btn, Card, StatusPill } from '@/components/ui';
import { cp, type ArchifyPackInfo } from '@/lib/api';

function openArchify(href: string) {
  window.open(href, '_blank', 'noopener,noreferrer');
}

/**
 * Opens the lab attack-map HTML (architecture / sequence) plus optional brief.
 * Files live under repo `.archify/` and are served at `/archify/...` via the control plane.
 */
export function ArchifyPackCard({ scenarioId }: { scenarioId: string }) {
  const [pack, setPack] = useState<ArchifyPackInfo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    void cp
      .getArchify(scenarioId)
      .then((info) => {
        if (!cancelled) setPack(info);
      })
      .catch((e) => {
        if (!cancelled) {
          setPack(null);
          setError(e instanceof Error ? e.message : 'Attack map unavailable');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scenarioId]);

  if (error) {
    return (
      <Card title="Attack map" subtitle="Compromise path for this lab">
        <p className="text-sm text-ink-muted">{error}</p>
      </Card>
    );
  }

  if (!pack) {
    return (
      <Card title="Attack map" subtitle="Compromise path for this lab">
        <p className="text-sm text-ink-muted">Loading map links…</p>
      </Card>
    );
  }

  if (!pack.available) {
    return (
      <Card
        title="Attack map"
        subtitle="Compromise path for this lab"
        action={<StatusPill status="offline" label="No map" />}
      >
        <p className="text-sm text-ink-muted">
          No attack map is on disk for this scenario yet.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Attack map"
      subtitle="How this supply-chain lab is wired end to end"
      action={<StatusPill status="online" label="Ready" />}
    >
      <p className="text-sm leading-relaxed text-ink-secondary">
        Open the lab topology or the step-by-step compromise path in a new tab.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {pack.diagrams.map((d) => (
          <Btn
            key={d.id}
            variant={d.id === 'architecture' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => openArchify(d.href)}
          >
            {d.id === 'architecture' ? 'Lab topology' : d.id === 'sequence' ? 'Compromise path' : d.label}
          </Btn>
        ))}
        {pack.brief && (
          <Btn variant="ghost" size="sm" onClick={() => openArchify(pack.brief!.href)}>
            Lab brief
          </Btn>
        )}
      </div>
    </Card>
  );
}
