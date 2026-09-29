'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Alert, Btn, Card, PageHeader, StatTile, StatusPill } from '@/components/ui';
import { cp, type PlatformStatus, type ProgressState, type ScenarioSummary } from '@/lib/api';
import { useControlPlaneDisplayHost, useBrowserFacingUrl } from '@/lib/use-hosts';
import { browserFacingUrl } from '@/lib/hosts';

interface ServiceRowProps {
  name: string;
  description: string;
  online: boolean;
  url?: string;
  actions?: ReactNode;
}

function ServiceRow({ name, description, online, url, actions }: ServiceRowProps) {
  const displayUrl = useBrowserFacingUrl(url);
  return (
    <div className="flex flex-col gap-3 rounded-xl liquid-glass p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-ink-primary">{name}</h3>
          <StatusPill status={online ? 'online' : 'offline'} label={online ? 'Running' : 'Stopped'} />
        </div>
        <p className="mt-1 text-xs text-ink-muted">{description}</p>
        {displayUrl && (
          <a
            href={displayUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block break-all text-xs text-brand hover:text-brand-light hover:underline"
          >
            {displayUrl}
          </a>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function KibanaOpenButton({ url }: { url?: string }) {
  const href = useBrowserFacingUrl(url ?? 5601);
  return (
    <a href={href || browserFacingUrl(5601)} target="_blank" rel="noreferrer">
      <Btn size="sm" variant="secondary">
        Open UI ↗
      </Btn>
    </a>
  );
}

function FlociOpenButton({ url }: { url?: string }) {
  const base = useBrowserFacingUrl(url ?? 4566) || browserFacingUrl(4566);
  const href = base ? `${base.replace(/\/$/, '')}/_floci/ui` : undefined;
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer">
      <Btn size="sm" variant="secondary">
        Open UI ↗
      </Btn>
    </a>
  );
}

export default function OverviewPage() {
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [scenarioCount, setScenarioCount] = useState(25);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [busy, setBusy] = useState('');
  const [cpReachable, setCpReachable] = useState(true);
  const cpDisplayHost = useControlPlaneDisplayHost();

  const refresh = useCallback(async () => {
    try {
      const [plat, list, prog] = await Promise.all([
        cp.platformStatus(),
        cp.getScenarios(),
        cp.getProgress().catch(() => null),
      ]);
      setStatus(plat);
      setScenarios(list);
      setScenarioCount(list.length);
      setProgress(prog);
      setCpReachable(true);
    } catch {
      setStatus(null);
      setCpReachable(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [refresh]);

  const run = async (
    label: string,
    fn: () => Promise<unknown>,
    opts?: { waitUntil?: (s: PlatformStatus | null) => boolean; maxWaitMs?: number },
  ) => {
    setBusy(label);
    try {
      // Platform scripts (Floci/ES) return immediately and run in the background
      await fn();
      await refresh();
      if (opts?.waitUntil) {
        const deadline = Date.now() + (opts.maxWaitMs ?? 8 * 60 * 1000);
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 3000));
          let latest: PlatformStatus | null = null;
          try {
            latest = await cp.platformStatus();
            setStatus(latest);
            setCpReachable(true);
          } catch {
            setCpReachable(false);
          }
          if (opts.waitUntil(latest)) break;
        }
      }
    } catch (err) {
      console.error(label, err);
    } finally {
      setBusy('');
      await refresh();
    }
  };

  const runningServices = [
    status?.elasticsearch.ok,
    status?.kibana.ok,
    status?.floci.ok,
  ].filter(Boolean).length;

  const guidedLabs = scenarios.filter((s) => s.lesson);
  const guidedComplete = guidedLabs.filter((s) => {
    const entry = progress?.scenarios[s.id];
    const need = s.lesson?.stepCount ?? 0;
    return need > 0 && (entry?.completedSteps?.length ?? 0) >= need;
  }).length;

  const resumeId = progress?.lastScenarioId;
  const resumeScenario = resumeId ? scenarios.find((s) => s.id === resumeId) : undefined;
  const resumeStep =
    resumeScenario && progress?.scenarios[resumeScenario.id]?.currentStepId
      ? progress.scenarios[resumeScenario.id].currentStepId
      : progress?.lastStepId;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Overview"
        title="Your lab command center"
        description="Start scenarios, watch live output, and manage observability — all on localhost."
        action={
          <Link href="/scenarios">
            <Btn size="lg">Browse labs →</Btn>
          </Link>
        }
      />

      {!cpReachable && (
        <Alert variant="error" >
          Control plane unreachable. Run <code className="rounded bg-canvas-hover px-1.5 py-0.5 font-mono text-xs">npm run dev:control-plane</code> or <code className="rounded bg-canvas-hover px-1.5 py-0.5 font-mono text-xs">./scripts/ui/start-dashboard.sh</code>
        </Alert>
      )}

      {busy && (
        <div className="mt-4">
          <Alert variant="info">
            <span className="font-medium">{busy}</span> running in the background — first Floci/ES start can take several minutes.
            Watch live logs in the <Link href="/scenarios" className="underline">Labs</Link> terminal dock
            while a scenario runs.
          </Alert>
        </div>
      )}

      {status?.portConflicts && status.portConflicts.length > 0 && (
        <div className="mt-4">
          <Alert variant="warn">
            Lab ports in use: {status.portConflicts.join(', ')} — stop conflicting labs or run Reset.
          </Alert>
        </div>
      )}

      {resumeScenario && (
        <div className="mt-6">
          <Card
            title="Continue where you left off"
            subtitle={`Lab ${resumeScenario.id}: ${resumeScenario.title}${resumeStep ? ` · step ${resumeStep}` : ''}`}
            action={
              <Link href={`/scenarios/${resumeScenario.id}`}>
                <Btn>Resume</Btn>
              </Link>
            }
          >
            <p className="text-sm text-ink-muted">
              Progress is stored in <span className="font-mono text-xs">~/.scas/progress.json</span> on this machine.
            </p>
          </Card>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Scenarios" value={scenarioCount} sub="Hands-on attack labs" accent="brand" />
        <StatTile
          label="Guided labs"
          value={`${guidedComplete}/${guidedLabs.length || 25}`}
          sub="Storyboard complete (all labs)"
          accent="ok"
        />
        <StatTile
          label="Control plane"
          value={cpReachable ? 'Online' : 'Offline'}
          sub={cpDisplayHost}
          accent={cpReachable ? 'ok' : 'warn'}
        />
        <StatTile label="Stack services" value={`${runningServices}/3`} sub="ES · Kibana · Floci" accent="warn" />
      </div>

      <div className="mt-10">
        <Card
          title="Platform stack"
          subtitle="Optional observability and cloud emulator — start only when you need them"
        >
          <div className="space-y-3">
            <ServiceRow
              name="Elasticsearch"
              description="Indexes detection events and runbooks"
              online={status?.elasticsearch.ok ?? false}
              url={status?.elasticsearch.url}
              actions={
                <>
                  <Btn
                    size="sm"
                    variant="success"
                    disabled={!!busy}
                    onClick={() => run('es-up', cp.esUp, { waitUntil: (s) => !!s?.elasticsearch.ok })}
                  >
                    {busy === 'es-up' ? 'Starting…' : 'Start'}
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    disabled={!!busy}
                    onClick={() => run('es-down', cp.esDown, { waitUntil: (s) => !s?.elasticsearch.ok, maxWaitMs: 120_000 })}
                  >
                    {busy === 'es-down' ? 'Stopping…' : 'Stop'}
                  </Btn>
                </>
              }
            />
            <ServiceRow
              name="Kibana"
              description="Visualize detections and hunt queries"
              online={status?.kibana.ok ?? false}
              url={status?.kibana.url}
              actions={<KibanaOpenButton url={status?.kibana.url} />}
            />
            <ServiceRow
              name="Floci"
              description="Local AWS emulator — CLI/seed scripts and web console (/_floci/ui)."
              online={status?.floci.ok ?? false}
              url={status?.floci.url}
              actions={
                <>
                  <FlociOpenButton url={status?.floci.url} />
                  <Btn
                    size="sm"
                    variant="secondary"
                    disabled={!!busy}
                    onClick={() => run('floci-setup', cp.flociSetup, { maxWaitMs: 60_000 })}
                  >
                    {busy === 'floci-setup' ? 'Setup…' : 'Setup'}
                  </Btn>
                  <Btn
                    size="sm"
                    variant="success"
                    disabled={!!busy}
                    onClick={() => run('floci-up', cp.flociUp, { waitUntil: (s) => !!s?.floci.ok })}
                  >
                    {busy === 'floci-up' ? 'Starting…' : 'Start'}
                  </Btn>
                  <Btn
                    size="sm"
                    variant="ghost"
                    disabled={!!busy}
                    onClick={() => run('floci-down', cp.flociDown, { waitUntil: (s) => !s?.floci.ok, maxWaitMs: 120_000 })}
                  >
                    {busy === 'floci-down' ? 'Stopping…' : 'Stop'}
                  </Btn>
                </>
              }
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card title="Quick start" subtitle="Recommended flow for first-time users">
          <ol className="space-y-3 text-sm text-ink-secondary">
            <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">1</span>Open lab 01 (guided storyboard)</li>
            <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">2</span>Run each step, watch the inspector fill</li>
            <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">3</span>Keep the live terminal dock open under Labs</li>
          </ol>
          <Link href="/scenarios/01" className="mt-5 inline-block">
            <Btn variant="secondary">Start lab 01</Btn>
          </Link>
        </Card>
        <Card title="Safety" subtitle="Education-only constraints">
          <ul className="space-y-2 text-sm text-ink-muted">
            <li>• Lab exfil still targets <span className="text-ink-secondary">127.0.0.1</span> only</li>
            <li>• UI binds on <span className="text-ink-secondary">0.0.0.0</span> for local/LAN access</li>
            <li>• Payloads require <span className="font-mono text-xs text-ink-secondary">TESTBENCH_MODE=enabled</span></li>
            <li>• Use Reset lab when finished to free ports</li>
          </ul>
          <Link href="/teardown" className="mt-5 inline-block">
            <Btn variant="danger" size="sm">Reset lab environment</Btn>
          </Link>
        </Card>
      </div>
    </div>
  );
}
