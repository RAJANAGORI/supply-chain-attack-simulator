/**
 * Turn raw mock-collector captures into a human consequence.
 *
 * The labs prove a payload fired by posting JSON to localhost. On its own that
 * JSON is abstract - a learner sees env vars and shrugs. This module walks the
 * captured payload, classifies what actually left the machine, and phrases it
 * the way an incident report would, so the learner feels the stakes instead of
 * reading a key-value dump.
 *
 * Everything is derived client-side from data the labs already captured. No new
 * exfiltration, no new collection - the safety model is untouched.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface BlastFinding {
  /** Short label, e.g. "Cloud credentials". */
  label: string;
  severity: Severity;
  /** The matched indicator (key name or pattern), never the secret value. */
  indicator: string;
  /** One line on what this means in production. */
  impact: string;
}

export interface BlastRadius {
  findings: BlastFinding[];
  /** Highest severity across findings, or 'info' when nothing matched. */
  worst: Severity;
  /** Count of distinct capture entries inspected. */
  captureCount: number;
  /** Headline for the breach panel. */
  headline: string;
  /** One-paragraph consequence summary. */
  summary: string;
}

/* Patterns that mark a value as dangerous if it leaves the box. We match on key
 * names and well-known token shapes, but never surface the secret itself. */
const KEY_RULES: Array<{ re: RegExp; label: string; severity: Severity; impact: string }> = [
  {
    re: /(AWS|_AWS|aws_).*(SECRET|KEY|TOKEN)|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN/i,
    label: 'Cloud credentials',
    severity: 'critical',
    impact: 'Full cloud account takeover. An attacker assumes your IAM identity.',
  },
  {
    re: /(GITHUB|GH)_?(TOKEN| PAT)|GITHUB_TOKEN/i,
    label: 'Source-control token',
    severity: 'critical',
    impact: 'Read/write to every repo the token can reach, including private code and CI secrets.',
  },
  {
    re: /(NPM|NODE)?_?AUTH_TOKEN|NPM_TOKEN|\/\/registry.*:_auth/i,
    label: 'Registry publish token',
    severity: 'critical',
    impact: 'Publish a malicious release under your name - the attack you just ran, weaponized.',
  },
  {
    re: /(API|APP)?_?(SECRET|KEY|TOKEN|PASSWORD|PASSWD)|BEARER|PRIVATE_KEY|SSH/i,
    label: 'Secret material',
    severity: 'high',
    impact: 'Direct access to whatever service this secret unlocks.',
  },
  {
    re: /(DB|DATABASE|MONGO|POSTGRES|MYSQL|REDIS).*(URL|URI|PASS|HOST)/i,
    label: 'Database connection',
    severity: 'high',
    impact: 'A live connection string is a straight path to your data.',
  },
  {
    re: /^(PWD|OLDPWD|HOME|USER|LOGNAME|HOSTNAME)$/i,
    label: 'Environment fingerprint',
    severity: 'low',
    impact: 'Reconnaissance: who you are, where the app runs, what to target next.',
  },
  {
    re: /(NODE_ENV|ENV|ENVIRONMENT|STAGE)/i,
    label: 'Runtime context',
    severity: 'low',
    impact: 'Tells the attacker whether this is dev, staging, or production.',
  },
];

const VALUE_RULES: Array<{ re: RegExp; label: string; severity: Severity; impact: string }> = [
  {
    re: /AKIA[0-9A-Z]{16}/,
    label: 'AWS access key id',
    severity: 'critical',
    impact: 'A live AWS key pair pattern. In production this is an account compromise.',
  },
  {
    re: /ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}/,
    label: 'GitHub token',
    severity: 'critical',
    impact: 'A real GitHub token shape - repo and workflow access.',
  },
  {
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    label: 'Private key',
    severity: 'critical',
    impact: 'A private key in the clear. Whatever it signs or decrypts is gone.',
  },
  {
    re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    label: 'JWT',
    severity: 'high',
    impact: 'A bearer token. Whoever holds it is you, until it expires.',
  },
];

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** Recursively walk a captured payload, yielding key/value string pairs. */
function* walkEntries(
  node: unknown,
  path: string[] = [],
): Generator<{ key: string; value: string; path: string[] }> {
  if (isRecord(node)) {
    for (const [k, v] of Object.entries(node)) {
      yield* walkEntries(v, [...path, k]);
    }
  } else if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      yield* walkEntries(node[i], [...path, String(i)]);
    }
  } else if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    yield { key: path[path.length - 1] ?? '', value: String(node), path };
  }
}

/** Count distinct capture entries across the whole captures map. */
export function countCaptures(captures: Record<string, unknown>): number {
  let n = 0;
  for (const v of Object.values(captures)) {
    if (!isRecord(v)) continue;
    for (const key of ['captures', 'events', 'beacons'] as const) {
      const arr = v[key];
      if (Array.isArray(arr)) n += arr.length;
    }
  }
  return n;
}

export function analyzeBlastRadius(captures: Record<string, unknown>): BlastRadius {
  const found = new Map<string, BlastFinding>();
  let captureCount = countCaptures(captures);

  for (const payload of Object.values(captures)) {
    for (const { key, value } of walkEntries(payload)) {
      for (const rule of KEY_RULES) {
        if (rule.re.test(key)) {
          const id = `k:${rule.label}`;
          if (!found.has(id)) {
            found.set(id, { label: rule.label, severity: rule.severity, indicator: key, impact: rule.impact });
          }
        }
      }
      for (const rule of VALUE_RULES) {
        if (rule.re.test(value)) {
          const id = `v:${rule.label}`;
          if (!found.has(id)) {
            found.set(id, { label: rule.label, severity: rule.severity, indicator: key || 'value', impact: rule.impact });
          }
        }
      }
    }
  }

  const findings = Array.from(found.values()).sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
  const worst: Severity = findings.length > 0 ? findings[0].severity : 'info';

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const headline =
    worst === 'critical'
      ? 'This would have been a breach'
      : worst === 'high'
        ? 'Real damage, not a drill'
        : worst === 'medium' || worst === 'low'
          ? 'A foothold, not a headline'
          : 'Payload fired, nothing sensitive left';

  let summary: string;
  if (worst === 'critical') {
    summary = `The payload pulled ${findings.length} class${findings.length === 1 ? '' : 'es'} of sensitive material off this machine, ${criticalCount} of them critical. On a real developer laptop or CI runner, the entries below are the difference between a bad afternoon and a public incident. This is exactly how the named breaches in this lab started.`;
  } else if (worst === 'high') {
    summary = `The payload exfiltrated material an attacker can act on directly. Nothing here is hypothetical - each entry below maps to a real escalation path.`;
  } else if (findings.length > 0) {
    summary = `The payload phoned home with reconnaissance data. Alone it looks harmless; combined with a follow-up stage it tells the attacker who you are and what to go after next.`;
  } else {
    summary = `The payload executed and reported back, but this run did not carry recognizable secrets. In a real environment the same code path would have had your full environment to work with.`;
  }

  return { findings, worst, captureCount, headline, summary };
}

/* ── Incident timeline reconstruction ─────────────── */

export interface TimelineEvent {
  /** ISO timestamp when known, else null. */
  at: string | null;
  /** Which lab / capture source produced it. */
  source: string;
  /** One-line description of what happened. */
  what: string;
  severity: Severity;
}

function shortPath(path: string[]): string {
  // Keep the last meaningful key so "data.environment.AWS_X" reads as "AWS_X".
  return path[path.length - 1] ?? 'payload';
}

/** Reconstruct a rough incident timeline from a captures map. */
export function reconstructTimeline(
  captures: Record<string, unknown>,
  sourceLabel: string,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const [capId, payload] of Object.entries(captures)) {
    if (!isRecord(payload)) continue;
    for (const key of ['captures', 'events', 'beacons'] as const) {
      const arr = payload[key];
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        const at =
          isRecord(entry) && typeof entry.timestamp === 'string'
            ? entry.timestamp
            : isRecord(entry) && isRecord(entry.data) && typeof entry.data.timestamp === 'string'
              ? entry.data.timestamp
              : null;

        // Classify the single most severe thing in this entry for the headline.
        let worst: Severity = 'info';
        let worstWhat = 'payload reported in';
        for (const { key: k, value, path } of walkEntries(entry)) {
          for (const rule of KEY_RULES) {
            if (rule.re.test(k) && SEVERITY_RANK[rule.severity] > SEVERITY_RANK[worst]) {
              worst = rule.severity;
              worstWhat = `exfiltrated ${rule.label.toLowerCase()} (${shortPath(path)})`;
            }
          }
          for (const rule of VALUE_RULES) {
            if (rule.re.test(value) && SEVERITY_RANK[rule.severity] > SEVERITY_RANK[worst]) {
              worst = rule.severity;
              worstWhat = `exfiltrated ${rule.label.toLowerCase()}`;
            }
          }
        }
        events.push({ at, source: sourceLabel || capId, what: worstWhat, severity: worst });
      }
    }
  }
  // Chronological, undated entries last.
  events.sort((a, b) => {
    if (!a.at && !b.at) return 0;
    if (!a.at) return 1;
    if (!b.at) return -1;
    return a.at.localeCompare(b.at);
  });
  return events;
}
