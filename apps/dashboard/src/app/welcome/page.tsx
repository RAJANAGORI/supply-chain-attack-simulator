'use client';

import Link from 'next/link';
import { Btn, Card, PageHeader } from '@/components/ui';

const TICKER = [
  { id: '01', title: 'Typosquatting' },
  { id: '02', title: 'Dependency confusion' },
  { id: '05', title: 'Build compromise' },
  { id: '06', title: 'Shai-Hulud worm' },
  { id: '14', title: 'Container supply chain' },
  { id: '21', title: 'Axios-style release' },
  { id: '24', title: 'Slopsquatting' },
  { id: '25', title: 'Compromised Action' },
];

export default function WelcomePage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="SCAS"
        title="Break the chain. Learn to defend it."
        description="Twenty-five localhost-only labs for modeling, detecting, and mitigating software supply chain attacks. The dashboard now hosts the guided experience that used to live only on the marketing site."
        action={
          <Link href="/scenarios/01">
            <Btn size="lg">Start lab 01</Btn>
          </Link>
        }
      />

      <div className="mt-2 flex flex-wrap gap-2">
        {TICKER.map((t) => (
          <Link
            key={t.id}
            href={`/scenarios/${t.id}`}
            className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted transition hover:border-brand hover:text-brand"
          >
            {t.id} {t.title}
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <Card title="Attack" subtitle="Red path">
          <p className="text-sm text-ink-secondary">
            Run intentionally malicious packages, mirrors, builds, and CI patterns - only when TESTBENCH_MODE is enabled.
          </p>
        </Card>
        <Card title="Detect" subtitle="Blue path">
          <p className="text-sm text-ink-secondary">
            Hunt IOCs with scanners, DETECT.md runbooks, and the Observatory timeline when Elasticsearch is up.
          </p>
        </Card>
        <Card title="Mitigate" subtitle="Hardening">
          <p className="text-sm text-ink-secondary">
            Apply pinning, scopes, SBOM checks, and playbooks that map to production policy.
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card title="Safety model" subtitle="Education gates">
          <ul className="space-y-2 text-sm text-ink-muted">
            <li>· Payloads require TESTBENCH_MODE=enabled</li>
            <li>· Exfil targets 127.0.0.1 only</li>
            <li>· Control plane stays local/LAN</li>
          </ul>
        </Card>
        <Card title="Where to go next" subtitle="Unified control center">
          <div className="flex flex-wrap gap-2">
            <Link href="/scenarios">
              <Btn variant="secondary">Labs</Btn>
            </Link>
            <Link href="/classroom">
              <Btn variant="secondary">Classroom</Btn>
            </Link>
            <Link href="/skills">
              <Btn variant="secondary">Skills</Btn>
            </Link>
            <Link href="/">
              <Btn variant="ghost">Overview</Btn>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
