'use client';

import { useState } from 'react';
import { Alert, Btn, Card, StatusPill } from '@/components/ui';
import {
  cp,
  waitForSession,
  type ReversalGrade,
  type ReversalGuardPolicy,
  type ReversalResult,
  type ReversalRound,
} from '@/lib/api';

/**
 * Purple-team reversal. The learner has run the attack and detected it; now
 * they author the control that would have stopped it and re-run the attack to
 * prove the control holds. For package labs the control is a dependency-guard
 * policy in the victim working directory; the control plane re-runs the
 * victim with the guard preloaded and checks whether a new capture appears.
 *
 * Labs with a `reversal.variant` fixture are polymorphic: round 2 replays the
 * attack under a mutated package name and payload shape. A name-only block
 * passes round 1 and fails round 2, so the learner has to author a behavioral
 * gate (allowOnly, denyDependencyEgress) instead.
 *
 * Provenance check: when `checkProvenance: true`, the guard verifies the
 * package's origin fingerprint (registry, publisher) matches the known good
 * list. An attacker who re-publishes under a different registry fails this
 * check even if the name matches.
 *
 * Ignore-scripts policy: when `ignoreScripts: true`, the guard skips any
 * postinstall/preinstall hooks the package declares, preventing lifecycle
 * hook exfil even if the package is allowed through.
 *
 * This is the step that closes the loop: attack -> detect -> prevent.
 */
export function PurpleReversal({
  scenarioId,
  blockedPackage,
  polymorphic = false,
}: {
  scenarioId: string;
  /** The package name the learner should block, e.g. "request-lib". */
  blockedPackage: string;
  /** True when the lab ships a mutated second round. */
  polymorphic?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReversalResult | null>(null);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [policyText, setPolicyText] = useState(
    JSON.stringify({ block: [blockedPackage] }, null, 2),
  );

  const run = async () => {
    setError('');
    let guard: ReversalGuardPolicy | undefined;
    if (polymorphic) {
      try {
        guard = JSON.parse(policyText) as ReversalGuardPolicy;
      } catch {
        setError('Your policy is not valid JSON yet. Fix it and run again.');
        return;
      }
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await cp.runReversal(scenarioId, guard);
      if (res.sessionId) void waitForSession(res.sessionId).catch(() => undefined);
      if (res.reversal) setResult(res.reversal);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reversal failed');
    } finally {
      setBusy(false);
    }
  };

  const addKey = (patch: Partial<ReversalGuardPolicy>) => {
    try {
      const cur = JSON.parse(policyText) as ReversalGuardPolicy;
      setPolicyText(JSON.stringify({ ...cur, ...patch }, null, 2));
    } catch {
      setPolicyText(JSON.stringify(patch, null, 2));
    }
  };

  const pillStatus = (r: ReversalResult) =>
    r.commandOk === false || r.grade === 'untested'
      ? 'warn'
      : r.held
        ? 'online'
        : 'warn';
  const pillLabel = (r: ReversalResult) => {
    if (r.commandOk === false || r.grade === 'untested') return 'Run failed';
    if (r.grade === 'behavioral') return 'Behavioral control held';
    if (r.grade === 'name-only') return 'Name-only: bypassed';
    if (r.grade === 'failed') return 'Attack still fired';
    return r.held ? 'Control held' : 'Attack still fired';
  };

  return (
    <Card
      title="Purple-team reversal"
      subtitle={
        polymorphic
          ? 'Author the control. The attacker will change its name.'
          : 'Author the control, then re-run the attack against it'
      }
      className={
        result ? (result.held ? 'ring-1 ring-state-ok/40' : 'ring-1 ring-state-error/40') : ''
      }
    >
      <p className="text-sm leading-relaxed text-ink-secondary">
        You ran the attack and saw the capture. Now stop it. Re-run writes{' '}
        <code className="rounded bg-canvas-hover px-1.5 py-0.5 font-mono text-[11px] text-ink-primary">
          dependency-guard.json
        </code>{' '}
        into this lab's victim directory
        {polymorphic ? ' from the policy below' : ' with the block list below'}, then starts the app
        with that guard loaded:
      </p>

      {polymorphic ? (
        <>
          <textarea
            value={policyText}
            onChange={(e) => setPolicyText(e.target.value)}
            spellCheck={false}
            rows={6}
            aria-label="dependency-guard.json policy"
            className="mt-3 w-full rounded-xl border border-line bg-[#0c0b14] p-4 font-mono text-[11px] leading-relaxed text-white/80 focus:border-accent focus:outline-none"
          />
          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
            Round 1 replays the attacker you already saw. Round 2 replays it after it republishes
            under a new package name with a reshaped payload, and that name is different every run.
            A block list only knows names, so it has to hold on behavior to pass. Keys the guard
            understands:{' '}
            <code className="font-mono text-ink-secondary">block</code>,{' '}
            <code className="font-mono text-ink-secondary">allowOnly</code>,{' '}
            <code className="font-mono text-ink-secondary">denyDependencyEgress</code>,{' '}
            <code className="font-mono text-ink-secondary">egressAllow</code>.
          </p>

          {/* Provenance & lifecycle hooks explanation */}
          <div className="mt-3 rounded-xl border border-line bg-canvas-hover/50 px-4 py-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between text-[11px] font-medium text-ink-secondary hover:text-ink-primary"
            >
              <span>Deeper attacks: provenance forgery & lifecycle hooks</span>
              <span className="text-lg leading-none">{showAdvanced ? '−' : '+'}</span>
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-ink-secondary">
                <p>
                  A sophisticated attacker does not just change the name. Two advanced techniques:
                </p>
                <ol className="list-decimal space-y-2 pl-5">
                  <li>
                    <code className="font-mono text-ink-primary">provenance forgery</code> — the
                    attacker publishes to a <em>different registry</em> but copies the publisher
                    metadata so the package <em>looks</em> legitimate. A{' '}
                    <code className="font-mono text-ink-secondary">checkProvenance</code> gate
                    catches this by comparing the registry fingerprint against the allow list.
                  </li>
                  <li>
                    <code className="font-mono text-ink-primary">lifecycle hooks</code> — the
                    attacker adds <code className="font-mono text-ink-secondary">postinstall</code>
                    scripts that run <em>before</em> npm import checks. Even if the package is
                    allowed through, the hook fires. An{' '}
                    <code className="font-mono text-ink-secondary">ignoreScripts: true</code> gate
                    strips lifecycle hooks before any code runs.
                  </li>
                </ol>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <pre className="mt-3 overflow-auto rounded-xl border border-line bg-[#0c0b14] p-4 font-mono text-[11px] leading-relaxed text-white/80">
            {`{
  "block": ["${blockedPackage}"]
}`}
          </pre>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
            When you run the reversal, the victim starts with your guard preloaded. If the guard
            refuses the package, the payload never executes and no new capture lands in the
            inspector.
          </p>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Btn variant="success" disabled={busy} onClick={() => void run()}>
          {busy
            ? polymorphic
              ? 'Running both rounds…'
              : 'Re-running attack…'
            : polymorphic
              ? 'Re-run original + mutated attack'
              : 'Re-run attack against my control'}
        </Btn>
        {result && <StatusPill status={pillStatus(result)} label={pillLabel(result)} />}
      </div>

      {error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {result && result.rounds && (
        <ul className="mt-4 space-y-2">
          {result.rounds.map((r) => (
            <RoundRow key={r.id} round={r} />
          ))}
        </ul>
      )}

      {result && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
            result.held
              ? 'border-state-ok/30 bg-state-ok/8 text-state-ok'
              : 'border-state-error/30 bg-state-error/8 text-state-error'
          }`}
        >
          <p className="font-medium">{result.message}</p>
          <p className="mt-1 text-[11px] opacity-80">
            captures before: {result.capturesBefore} · after: {result.capturesAfter}
          </p>
          {result.held && (
            <p className="mt-2 text-[11px] opacity-80">
              This is the full loop: you executed the attack, detected it in the inspector, and
              wrote the control that blocks it. That is the job.
            </p>
          )}
        </div>
      )}

      {result && result.grade === 'name-only' && (
        <NameOnlyHelp grade={result.grade} onAdd={addKey} />
      )}

      {result && result.rounds && (
        <AdvancedAttackHelp onAdd={addKey} />
      )}
    </Card>
  );
}

function RoundRow({ round }: { round: ReversalRound }) {
  const gate =
    round.blockedBy === 'egress'
      ? 'denyDependencyEgress'
      : round.blockedBy === 'allowlist'
        ? 'allowOnly'
        : round.blockedBy === 'blocklist'
          ? 'block list'
          : round.blockedBy === 'provenance'
            ? 'checkProvenance'
            : round.blockedBy === 'ignoreScripts'
              ? 'ignoreScripts'
              : null;
  return (
    <li className="rounded-xl border border-line bg-canvas-hover px-3 py-2 text-[12px] leading-relaxed">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill
          status={round.commandOk ? (round.held ? 'online' : 'warn') : 'warn'}
          label={!round.commandOk ? 'Run failed' : round.held ? 'Blocked' : 'Got through'}
        />
        <span className="font-medium text-ink-primary">{round.label}</span>
        {gate && <span className="text-ink-faint">stopped by {gate}</span>}
      </div>
      {round.attacker && (
        <p className="mt-1 font-mono text-[11px] text-ink-faint">
          {round.attacker.packageName} · {round.attacker.mutation} · {round.attacker.delivery}
          {round.attacker.delivery === 'timer' ? ` ${round.attacker.delayMs}ms` : ''} ·{' '}
          {round.attacker.encoding} payload · seed {round.attacker.seed}
        </p>
      )}
      {round.provenance && (
        <p className="mt-1 text-[11px] text-ink-faint">
          provenance: <span className={round.provenance.check ? 'text-green-400' : 'text-red-400'}>
            {round.provenance.check ? 'verified' : 'forged'}
          </span>{' '}
          {round.provenance.registry ? `from ${round.provenance.registry}` : ''}
        </p>
      )}
      <p className="mt-1 text-[11px] text-ink-faint">
        captures {round.capturesBefore} to {round.capturesAfter}
      </p>
    </li>
  );
}

function NameOnlyHelp({
  grade,
  onAdd,
}: {
  grade: ReversalGrade;
  onAdd: (patch: Partial<ReversalGuardPolicy>) => void;
}) {
  if (grade !== 'name-only') return null;
  return (
    <div className="mt-4 rounded-xl border border-line px-4 py-3 text-[12px] leading-relaxed text-ink-secondary">
      <p className="font-medium text-ink-primary">Why the name block was not enough</p>
      <p className="mt-1">
        Your block list matched one string. The attacker changed the string and the payload still
        ran. Pick a control that does not care what the package is called:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          <code className="font-mono">allowOnly</code> - list the third-party packages the app is
          supposed to import. Everything else is refused, whatever its name.
        </li>
        <li>
          <code className="font-mono">denyDependencyEgress</code> - dependency code may not open
          outbound http, https or fetch connections at all. The exfil call dies even if the package
          loads.
        </li>
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="secondary" onClick={() => onAdd({ allowOnly: [] })}>
          Add allowOnly key
        </Btn>
        <Btn variant="secondary" onClick={() => onAdd({ denyDependencyEgress: true })}>
          Add denyDependencyEgress
        </Btn>
      </div>
      <p className="mt-2 text-[11px] text-ink-faint">
        The allowOnly button adds an empty list. Fill in the package you actually want to keep, for
        example requests-lib, before you re-run.
      </p>
    </div>
  );
}

/**
 * Advanced help: shows provenance and ignore-scripts options when the learner
 * has survived round 1 but the attacker uses provenance forgery or lifecycle
 * hook exfil in round 2.
 */
function AdvancedAttackHelp({
  onAdd,
}: {
  onAdd: (patch: Partial<ReversalGuardPolicy>) => void;
}) {
  return (
    <div className="mt-4 rounded-xl border border-line px-4 py-3 text-[12px] leading-relaxed text-ink-secondary">
      <p className="font-medium text-ink-primary">The attacker changed tactics</p>
      <p className="mt-1">
        The attacker is now publishing from a <em>different registry</em> (provenance forgery) or
        using <em>lifecycle hooks</em> (postinstall scripts) to run code before checks. Add one of
        these gates:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          <code className="font-mono">checkProvenance: true</code> — verifies the package origin
          (registry URL, publisher) against the allow list. A provenance-forged package from a
          different registry fails even if the name matches.
        </li>
        <li>
          <code className="font-mono">ignoreScripts: true</code> — strips postinstall/preinstall
          hooks before any code runs. Lifecycle hook exfil cannot fire.
        </li>
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="secondary" onClick={() => onAdd({ checkProvenance: true })}>
          Add checkProvenance
        </Btn>
        <Btn variant="secondary" onClick={() => onAdd({ ignoreScripts: true })}>
          Add ignoreScripts
        </Btn>
      </div>
    </div>
  );
}
