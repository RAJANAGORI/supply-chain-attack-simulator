'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Btn, Card, PageHeader, StatusPill } from '@/components/ui';
import { cp, type TimelinePayload } from '@/lib/api';
import { useBrowserFacingUrl } from '@/lib/use-hosts';
import { browserFacingUrl } from '@/lib/hosts';

export default function ObservePage() {
  const [timeline, setTimeline] = useState<TimelinePayload | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const kibanaHref = useBrowserFacingUrl(5601);
  const esDisplay = useBrowserFacingUrl(timeline?.url);

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
    setError('');
    try {
      await cp.esUp();
      // Script returns immediately; wait until ES answers or we time out.
      const deadline = Date.now() + 3 * 60 * 1000;
      while (Date.now() < deadline) {
        const next = await cp.getTimeline(80);
        setTimeline(next);
        if (next.ok) {
          setError('');
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      setError(
        'Elasticsearch did not become reachable in time. Run ./scripts/observability/elasticsearch-up.sh from the repo root and watch Docker Desktop.',
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} - is the control plane running on :3101?`
          : 'ES start failed',
      );
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
            <a href={kibanaHref || browserFacingUrl(5601)} target="_blank" rel="noreferrer">
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
          <span className="text-xs text-ink-faint">{esDisplay || timeline.url}</span>
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
          <div className="mb-4 space-y-2 text-sm text-ink-muted">
            <p>
              Observatory needs Docker running, then Elasticsearch on port 9200. Labs still work without
              ES.
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Start Docker and wait until it is idle</li>
              <li>
                From the repo root run{' '}
                <code className="rounded bg-canvas-hover px-1.5 py-0.5 font-mono text-xs">
                  ./scripts/observability/elasticsearch-up.sh
                </code>
              </li>
              <li>
                Export{' '}
                <code className="rounded bg-canvas-hover px-1.5 py-0.5 font-mono text-xs">
                  SCAS_ES_URL=http://127.0.0.1:9200
                </code>{' '}
                on the lab host before starting mocks (loopback is correct on the server; the UI links
                use this page&apos;s hostname for your browser)
              </li>
              <li>Re-run a lab, then hit Refresh here</li>
            </ol>
            <p>
              Forwarding only happens when mocks see{' '}
              <code className="font-mono text-xs">SCAS_ES_URL</code>. Manage the stack from{' '}
              <Link href="/" className="text-brand hover:underline">
                Overview
              </Link>{' '}
              once the control plane is up.
            </p>
          </div>
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
