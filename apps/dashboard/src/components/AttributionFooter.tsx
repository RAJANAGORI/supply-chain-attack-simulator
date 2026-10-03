'use client';

import { useEffect, useState } from 'react';
import { cp, type Provenance } from '@/lib/api';

/**
 * Authorship footer shown on every dashboard page. Sourced from the control
 * plane's /provenance endpoint, which reads SCAS_PROVENANCE.json. A cloned
 * instance still displays the original author unless someone deliberately
 * strips it - and deliberate removal of a served copyright notice is willful
 * infringement under the MIT license, which is exactly what makes it stick.
 */
export function AttributionFooter() {
  const [prov, setProv] = useState<Provenance | null>(null);

  useEffect(() => {
    cp.getProvenance()
      .then(setProv)
      .catch(() => setProv(null));
  }, []);

  if (!prov) return null;

  return (
    <footer className="mt-12 border-t border-line pt-5 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-ink-faint">
        <p>
          {prov.name} · © {prov.copyright.replace(/^.*?(\d{4})/, '$1')}{' '}
          <a
            href={prov.creatorUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-ink-muted transition hover:text-brand"
          >
            {prov.creator}
          </a>
        </p>
        <p className="font-mono" title="Authorship fingerprint - verify with scripts/provenance/verify-provenance.sh">
          {prov.fingerprint}
        </p>
        <a
          href={prov.repository}
          target="_blank"
          rel="noreferrer"
          className="transition hover:text-brand"
        >
          Original project
        </a>
      </div>
    </footer>
  );
}
