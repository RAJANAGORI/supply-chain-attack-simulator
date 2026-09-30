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
    if (
      !confirm(
        'Reset everything to a clean slate?\n\n' +
          'This clears lab progress, storyboard steps, captures, scenario node_modules, and frees lab ports.\n' +
          'The Control Center (dashboard + control plane) stays running.',
      )
    ) {
      return;
    }
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
        // Belt-and-suspenders if the async script path raced progress write
        try {
          await cp.resetProgress();
        } catch {
          /* already cleared by teardown handler */
        }
        try {
          await cp.clearLogs();
        } catch {
          /* non-fatal */
        }
        setPhase('done');
        setResult(
          (prev) =>
            `${prev}\n\nReset finished. Progress is zeroed, lab ports/captures cleaned, terminal cleared. Open Labs and run setup on a scenario to start fresh.`,
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
        description="Full clean slate: lab progress, storyboard status, captures, scenario installs, and lab ports. Control Center stays up."
        action={
          phase === 'running' ? (
            <StatusPill status="busy" label="Resetting…" />
          ) : phase === 'done' ? (
            <StatusPill status="online" label="Clean" />
          ) : phase === 'failed' ? (
            <StatusPill status="offline" label="Failed" />
          ) : null
        }
      />

      <Alert variant="warn">
        Wipes learner progress (~/.scas/progress.json), stops mock servers, deletes capture files and
        scenario node_modules, and frees lab ports. Does not stop Elasticsearch, Kibana, Floci, or this
        UI.
      </Alert>

      <Card
        className="mt-6"
        title="Full teardown"
        subtitle="Stops labs, clears progress + captures, runs scripts/setup/teardown.sh"
      >
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
