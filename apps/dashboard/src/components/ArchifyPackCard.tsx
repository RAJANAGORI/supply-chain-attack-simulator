'use client';

import { useEffect, useState } from 'react';
import { Btn, Card, StatusPill } from '@/components/ui';
import { cp, type ArchifyPackInfo } from '@/lib/api';

function openArchify(href: string) {
  window.open(href, '_blank', 'noopener,noreferrer');
}

/**
 * Opens Archify architecture / sequence HTML (and optional brief) for this lab.
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
          setError(e instanceof Error ? e.message : 'Archify pack unavailable');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scenarioId]);

  if (error) {
    return (
      <Card title="Archify diagrams" subtitle="Attack maps for this lab">
        <p className="text-sm text-ink-muted">{error}</p>
      </Card>
    );
  }

  if (!pack) {
    return (
      <Card title="Archify diagrams" subtitle="Attack maps for this lab">
        <p className="text-sm text-ink-muted">Loading diagram links…</p>
      </Card>
    );
  }

  if (!pack.available) {
    return (
      <Card
        title="Archify diagrams"
        subtitle="Attack maps for this lab"
        action={<StatusPill status="offline" label="No pack" />}
      >
        <p className="text-sm text-ink-muted">
          No `.archify/scenarios/{pack.slug}` pack on disk yet.
        </p>
      </Card>
    );
  }

  return (
    <Card
      title="Archify diagrams"
      subtitle={`.archify/scenarios/${pack.slug}`}
      action={<StatusPill status="online" label="Ready" />}
    >
      <p className="text-sm leading-relaxed text-ink-secondary">
        Interactive architecture and sequence HTML for this lab. Opens in a new tab via{' '}
        <span className="font-mono text-[11px]">/archify/…</span>.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {pack.diagrams.map((d) => (
          <Btn key={d.id} variant="secondary" size="sm" onClick={() => openArchify(d.href)}>
            Open {d.label.toLowerCase()}
          </Btn>
        ))}
        {pack.brief && (
          <Btn variant="ghost" size="sm" onClick={() => openArchify(pack.brief!.href)}>
            Open brief
          </Btn>
        )}
      </div>
    </Card>
  );
}
