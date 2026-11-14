/**
 * Host-side probes for the optional platform stack (ES / Kibana / Floci).
 *
 * Must stay aligned with STACK RADAR in scripts/ui/run-everything.sh:
 * curl to loopback ports that Docker published. Do not run these URLs through
 * rewriteLabUrl / SCAS_CAPTURE_HOST - that rewrite is for lab mock captures
 * inside Docker networks, not for the host observability stack.
 */

export function platformHost(): string {
  const host = process.env.SCAS_PLATFORM_HOST || '127.0.0.1';
  // 0.0.0.0 is a bind address, not a probe target
  if (host === '0.0.0.0' || host === '::') return '127.0.0.1';
  return host;
}

type Accept = (status: number) => boolean;

async function probeOnce(
  url: string,
  opts?: { headers?: Record<string, string>; accept?: Accept; timeoutMs?: number },
): Promise<boolean> {
  const accept = opts?.accept ?? ((status) => status >= 200 && status < 400);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: opts?.headers,
      // manual: Kibana root often 302s; we still count that as reachable
      redirect: 'manual',
      signal: AbortSignal.timeout(opts?.timeoutMs ?? 5000),
    });
    return accept(res.status);
  } catch {
    return false;
  }
}

/** Elasticsearch: same signal as elasticsearch-up.sh / STACK RADAR. */
export async function probeElasticsearch(host = platformHost()): Promise<boolean> {
  const base = `http://${host}:9200`;
  if (await probeOnce(`${base}/_cluster/health`)) return true;
  return probeOnce(`${base}/`);
}

/**
 * Kibana: STACK RADAR only hits `/`. Control plane used to require `/api/status`
 * alone, which can 503 while the UI is already serving. Try status first, then root.
 */
export async function probeKibana(host = platformHost()): Promise<boolean> {
  const base = `http://${host}:5601`;
  if (
    await probeOnce(`${base}/api/status`, {
      headers: { 'kbn-xsrf': 'true', Accept: 'application/json' },
      // 503 = process up but plugins still loading - still "running" for Start/Stop UI
      accept: (s) => (s >= 200 && s < 400) || s === 503,
    })
  ) {
    return true;
  }
  return probeOnce(`${base}/`, {
    accept: (s) => (s >= 200 && s < 400) || s === 503,
  });
}

/** Floci: health endpoint, then root (STACK RADAR fallback). */
export async function probeFlociStack(host = platformHost()): Promise<boolean> {
  const base = `http://${host}:4566`;
  if (await probeOnce(`${base}/_floci/health`)) return true;
  return probeOnce(`${base}/`);
}

export async function probePlatformStack(host = platformHost()) {
  const [elasticsearchOk, kibanaOk, flociOk] = await Promise.all([
    probeElasticsearch(host),
    probeKibana(host),
    probeFlociStack(host),
  ]);
  return {
    host,
    elasticsearch: { ok: elasticsearchOk, url: `http://${host}:9200` },
    kibana: { ok: kibanaOk, url: `http://${host}:5601` },
    floci: { ok: flociOk, url: `http://${host}:4566` },
  };
}
