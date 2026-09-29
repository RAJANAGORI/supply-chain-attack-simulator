'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert, Btn, Card, PageHeader, StatusPill } from '@/components/ui';
import { cp, waitForSession } from '@/lib/api';

export default function TeardownPage() {
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'failed'>('idle');

  const runTeardown = async () => {
    if (!confirm('Reset the lab environment? This stops mock servers and clears captured data.')) return;
    setBusy(true);
    setPhase('running');
    setResult('');
    try {
      const res = await cp.teardown();
      setResult(JSON.stringify(res, null, 2));
      const sid = res.sessionId;
      if (sid) {
        const finished = await waitForSession(sid, { maxWaitMs: 10 * 60 * 1000 });
        if (finished?.status === 'failed') {
          setPhase('failed');
          setResult(
            (prev) =>
              `${prev}\n\nTeardown exited with code ${finished.exitCode ?? 'null'}. Control Center should still be up — try Reset again or check Labs terminal.`,
          );
          return;
        }
      }
      // Confirm control plane survived (old bug: teardown killed CP via lsof clients)
      try {
        await cp.platformStatus();
        setPhase('done');
        // Backup clear if process-end hook already ran this is a no-op wipe (still fresh).
        try {
          await cp.clearLogs();
        } catch {
          /* non-fatal */
        }
        setResult(
          (prev) =>
            `${prev}\n\nReset finished. Control plane is still online — live terminal is cleared. Start a new lab when ready.`,
        );
      } catch {
        setPhase('failed');
        setResult(
          (prev) =>
            `${prev}\n\n✗ Control plane went offline during reset. Run ./scripts/ui/start-dashboard.sh again.`,
        );
      }
    } catch (e) {
      setPhase('failed');
      setResult(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <PageHeader
        eyebrow="System"
        title="Reset lab environment"
        description="Frees scenario ports and removes captured artefacts. The Control Center (dashboard + control plane) stays running."
        action={
          phase === 'running' ? (
            <StatusPill status="busy" label="Resetting…" />
          ) : phase === 'done' ? (
            <StatusPill status="online" label="Ready" />
          ) : phase === 'failed' ? (
            <StatusPill status="offline" label="Failed" />
          ) : null
        }
      />

      <Alert variant="warn">
        Stops lab mock servers and clears capture files. Does not stop Elasticsearch, Kibana, Floci, or this UI.
      </Alert>

      <Card className="mt-6" title="Full teardown" subtitle="Runs scripts/setup/teardown.sh — watch status below (not Labs dock)">
        <div className="flex flex-wrap gap-3">
          <Btn variant="danger" size="lg" disabled={busy} onClick={runTeardown}>
            {busy ? 'Resetting…' : 'Reset environment'}
          </Btn>
          <Link href="/scenarios">
            <Btn variant="ghost">Back to labs</Btn>
          </Link>
        </div>
      </Card>

      {result && (
        <Card className="mt-4" title="Result">
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-ink-muted">{result}</pre>
        </Card>
      )}
    </div>
  );
}
