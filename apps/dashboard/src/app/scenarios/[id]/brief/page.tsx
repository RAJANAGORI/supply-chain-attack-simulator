'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { LabBriefMarkdown } from '@/components/LabBriefMarkdown';
import { Alert, Btn, Card, PageHeader, StatusPill } from '@/components/ui';
import { cp, type ArchifyBriefPayload } from '@/lib/api';

export default function ScenarioBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [brief, setBrief] = useState<ArchifyBriefPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void cp
      .getArchifyBrief(id)
      .then((data) => {
        if (!cancelled) setBrief(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setBrief(null);
          setError(e instanceof Error ? e.message : 'Failed to load lab brief');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <StatusPill status="busy" label="Loading lab brief…" />
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="animate-fade-in">
        <Alert variant="error">{error || 'No lab brief for this scenario'}</Alert>
        <Link href={`/scenarios/${id}`} className="mt-4 inline-block">
          <Btn variant="secondary">← Back to lab</Btn>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Link
        href={`/scenarios/${id}`}
        className="text-xs font-medium text-ink-muted transition hover:text-brand"
      >
        ← Back to lab {id}
      </Link>

      <PageHeader
        eyebrow={`Lab ${brief.scenarioId} · attack map`}
        title="Lab brief"
        description="Same Control Center chrome, rendered from the scenario architecture brief."
        action={
          <div className="flex flex-wrap gap-2">
            {brief.diagrams.map((d) => (
              <a key={d.id} href={d.href} target="_blank" rel="noopener noreferrer">
                <Btn variant={d.id === 'architecture' ? 'primary' : 'secondary'} size="sm">
                  {d.id === 'architecture' ? 'Lab topology' : d.id === 'sequence' ? 'Compromise path' : d.label}
                </Btn>
              </a>
            ))}
          </div>
        }
      />

      <Card className="overflow-hidden">
        <div className="px-1 py-1 sm:px-2 sm:py-2">
          <LabBriefMarkdown markdown={brief.markdown} slug={brief.slug} />
        </div>
      </Card>

      {/* Taxonomy tags: ATT&CK, NIST, MITRE */}
      <div className="mt-6 space-y-4">
        {brief.attck && brief.attck.length > 0 && (
          <div>
            <h4 className="font-semibold uppercase tracking-wider text-xs text-brand mb-2">
              ATT&amp;CK mapping
            </h4>
            <div className="flex flex-wrap gap-2">
              {brief.attck.map((a) => (
                <span key={a} className="text-xs font-mono px-2 py-1 bg-slate-800/60 border border-slate-700/50 rounded text-slate-300">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {brief.nist && brief.nist.length > 0 && (
          <div>
            <h4 className="font-semibold uppercase tracking-wider text-xs text-emerald-400 mb-2">
              NIST SP 800 refs
            </h4>
            <div className="flex flex-wrap gap-2">
              {brief.nist.map((n) => (
                <span key={n} className="text-xs font-mono px-2 py-1 bg-emerald-900/20 border border-emerald-700/40 rounded text-emerald-300">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {brief.mitre && brief.mitre.length > 0 && (
          <div>
            <h4 className="font-semibold uppercase tracking-wider text-xs text-amber-400 mb-2">
              MITRE context
            </h4>
            <div className="flex flex-wrap gap-2">
              {brief.mitre.map((m) => (
                <span key={m} className="text-xs font-mono px-2 py-1 bg-amber-900/20 border border-amber-700/40 rounded text-amber-300">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
