import { Card, StatusPill } from '@/components/ui';
import type { ActRuntime, ScenarioActRunner } from '@/lib/api';

function runtimeCopy(runtime: ActRuntime | undefined): { status: 'online' | 'warn' | 'offline'; label: string; detail: string } {
  if (!runtime) {
    return {
      status: 'offline',
      label: 'Runner unknown',
      detail: 'The control plane did not report whether act is installed. The terminal banner still says which runner executed the workflow.',
    };
  }
  if (runtime.mode === 'ready') {
    const version = runtime.version ? `${runtime.version}. ` : '';
    return {
      status: 'online',
      label: 'act will run this step',
      detail: runtime.required
        ? `${version}SCAS_ACT_REQUIRED=1. If act fails, the lab stops instead of switching to the Node simulator.`
        : `${version}The terminal opens with an SCAS runner banner, lists the bindings below, then prints the act log.`,
    };
  }
  if (runtime.mode === 'skipped') {
    return {
      status: 'warn',
      label: 'SCAS_SKIP_ACT=1',
      detail: runtime.version
        ? `act is installed (${runtime.version}) and this process will skip it. The button runs the Node simulator. The banner will say so.`
        : 'This process will skip act. The button runs the Node simulator. The banner will say so.',
    };
  }
  if (runtime.mode === 'too-old') {
    return {
      status: 'warn',
      label: 'act is too old',
      detail: 'The installed act does not support --local-repository, which is how these labs bind a uses: line to a folder. The button will use the Node simulator unless SCAS_ACT_REQUIRED=1, in which case the run fails.',
    };
  }
  return {
    status: 'warn',
    label: runtime.required ? 'act required, not installed' : 'act not installed',
    detail: runtime.required
      ? 'SCAS_ACT_REQUIRED=1, so Run will fail until act is installed. ./scripts/setup/ensure-act.sh'
      : 'Run will use the Node simulator. Install act with ./scripts/setup/ensure-act.sh if you want the workflow file itself to execute.',
  };
}

export function ActRunnerCard({ act, runtime }: { act: ScenarioActRunner; runtime?: ActRuntime }) {
  const state = runtimeCopy(runtime);
  return (
    <Card
      title="Local GitHub Actions runner"
      subtitle={act.workflow}
      action={<StatusPill status={state.status} label={state.label} />}
    >
      <p className="text-sm leading-relaxed text-ink-secondary">{act.summary}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{state.detail}</p>
      <ul className="mt-4 space-y-3">
        {act.maps.map((row) => (
          <li key={row.uses} className="rounded-xl border border-line bg-canvas-hover/50 px-3 py-3">
            <p className="font-mono text-xs text-ink-primary">{row.uses}</p>
            <p className="mt-1 font-mono text-[11px] text-ink-muted">folder: {row.local}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{row.why}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-ink-muted">{act.fallback}</p>
    </Card>
  );
}
