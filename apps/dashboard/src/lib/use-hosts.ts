'use client';

import { useEffect, useState } from 'react';
import { browserFacingUrl, controlPlaneDisplayHost } from './hosts';

const CP_PORT = process.env.NEXT_PUBLIC_CONTROL_PLANE_PORT ?? '3101';

/** Resolved control-plane label for display — avoids SSR/client hydration mismatch. */
export function useControlPlaneDisplayHost(): string {
  const [host, setHost] = useState(controlPlaneDisplayHost);

  useEffect(() => {
    setHost(`:${CP_PORT} proxied via :${window.location.port || '3100'}`);
  }, []);

  return host;
}

/** Loopback → current page hostname (for Kibana / ES / Floci links on LAN demos). */
export function useBrowserFacingUrl(urlOrPort: string | number | undefined): string {
  const [href, setHref] = useState(() => {
    if (urlOrPort == null) return '';
    if (typeof urlOrPort === 'number') return `http://127.0.0.1:${urlOrPort}`;
    return urlOrPort;
  });

  useEffect(() => {
    if (urlOrPort == null) {
      setHref('');
      return;
    }
    setHref(browserFacingUrl(urlOrPort));
  }, [urlOrPort]);

  return href;
}
