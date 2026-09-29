'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Btn, Card, PageHeader, StatusPill } from '@/components/ui';
import { cp, type TimelinePayload } from '@/lib/api';

export default function ObservePage() {
  const [timeline, setTimeline] = useState<TimelinePayload | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      setTimeline(await cp.getTimeline(80));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load timeline');
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  const startEs = async () => {
    setBusy('es-up');
    try {
      await cp.esUp();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ES start failed');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Observatory"
        title="Attack timeline"
        description="Reads recent documents from the scas-detections Elasticsearch index when the stack is up."
        action={
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" onClick={() => void load()}>
              Refresh
            </Btn>
            <Btn variant="success" disabled={!!busy} onClick={() => void startEs()}>
              {busy === 'es-up' ? 'Starting ES…' : 'Start Elasticsearch'}
            </Btn>
            <a href="http://127.0.0.1:5601" target="_blank" rel="noreferrer">
              <Btn variant="ghost">Open Kibana</Btn>
            </a>
          </div>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {timeline && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusPill
            status={timeline.ok ? 'online' : 'warn'}
            label={timeline.ok ? 'ES reachable' : 'ES offline'}
          />
          <span className="text-xs text-ink-faint">{timeline.url}</span>
          {!timeline.ok && timeline.error && (
            <span className="text-xs text-state-warn">{timeline.error}</span>
          )}
        </div>
      )}

      <Card
        title="Detection events"
        subtitle={
          timeline?.ok
            ? `${timeline.events.length} recent hits (newest first)`
            : 'Start Elasticsearch and re-run a lab with SCAS_ES_URL set to populate this view'
        }
      >
        {!timeline?.ok && (
          <p className="mb-4 text-sm text-ink-muted">
            Labs still work without ES. Forwarding only happens when mocks see{' '}
            <code className="font-mono text-xs">SCAS_ES_URL</code>. See{' '}
            <Link href="/" className="text-brand hover:underline">
              Overview
            </Link>{' '}
            to manage the stack.
          </p>
        )}
        <ul className="max-h-[70vh] space-y-2 overflow-auto">
          {(timeline?.events ?? []).map((ev, i) => {
            const ts = String(ev['@timestamp'] ?? ev.timestamp ?? ev.time ?? '');
            const scenario = String(ev.scenarioId ?? ev.scenario ?? ev.lab ?? '');
            const msg = String(ev.message ?? ev.rule ?? ev.event ?? JSON.stringify(ev).slice(0, 180));
            return (
              <li
                key={String(ev.id ?? i)}
                className="rounded-xl border border-line bg-canvas-hover/40 px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap gap-2 text-ink-faint">
                  {ts && <span className="font-mono">{ts}</span>}
                  {scenario && <span>lab {scenario}</span>}
                </div>
                <p className="mt-1 text-ink-secondary">{msg}</p>
              </li>
            );
          })}
          {timeline?.ok && timeline.events.length === 0 && (
            <li className="text-sm text-ink-muted">Index is reachable but empty. Run a lab with ES forwarding enabled.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
