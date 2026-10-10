import { Btn, Card, StatusPill } from '@/components/ui';
import type { FlociRuntime } from '@/lib/api';

function statusOf(runtime: FlociRuntime): { status: 'online' | 'warn' | 'offline'; label: string; detail: string } {
  if (!runtime.enabled) {
    return {
      status: 'offline',
      label: 'Floci CLI will not run',
      detail: 'SCAS_FLOCI_ENABLED is not 1 in this lab environment. The attack step still records on the mock server. It does not call the Floci CLI.',
    };
  }
  if (!runtime.reachable) {
    return {
      status: 'warn',
      label: 'Floci CLI enabled, endpoint down',
      detail: `${runtime.endpoint} did not answer /_floci/health. A run that calls the CLI will say so in the terminal. Start it with ./scripts/floci/floci-up.sh.`,
    };
  }
  return {
    status: 'online',
    label: 'Floci CLI will run',
    detail: `${runtime.endpoint} is up. A call prints an SCAS runner banner, the scenario id, and s3://${runtime.bucket}/...`,
  };
}

export function FlociRunnerCard({
  runtime,
  busy,
  onSeed,
  onVerify,
}: {
  runtime: FlociRuntime;
  busy?: string;
  onSeed?: () => void;
  onVerify?: () => void;
}) {
  const state = statusOf(runtime);
  return (
    <Card
      title="Local AWS emulator (Floci)"
      subtitle={`s3://${runtime.bucket}`}
      action={<StatusPill status={state.status} label={state.label} />}
    >
      <p className="text-sm leading-relaxed text-ink-secondary">{state.detail}</p>
      {!runtime.attackCalls && (
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          This lab's attack step does not call the Floci CLI. The calls below are the ones that do.
        </p>
      )}
      <ul className="mt-4 space-y-3">
        {runtime.calls.map((row) => (
          <li key={`${row.when}-${row.script}`} className="rounded-xl border border-line bg-canvas-hover/50 px-3 py-3">
            <p className="text-xs font-medium text-ink-primary">{row.when}</p>
            <p className="mt-1 font-mono text-[11px] text-ink-muted">{row.script}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{row.what}</p>
          </li>
        ))}
      </ul>
      {runtime.seedNote && (
        <p className="mt-4 text-xs leading-relaxed text-ink-muted">{runtime.seedNote}</p>
      )}
      {(onSeed || onVerify) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onSeed && (
            <Btn variant="secondary" size="sm" disabled={!!busy} onClick={onSeed}>
              {busy === 'floci-seed' ? 'Seeding…' : 'Seed'}
            </Btn>
          )}
          {onVerify && (
            <Btn variant="secondary" size="sm" disabled={!!busy} onClick={onVerify}>
              {busy === 'floci-verify' ? 'Verifying…' : 'Verify'}
            </Btn>
          )}
        </div>
      )}
    </Card>
  );
}
