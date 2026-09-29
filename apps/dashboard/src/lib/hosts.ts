const DEFAULT_HOST = '0.0.0.0';
const CP_PORT = process.env.NEXT_PUBLIC_CONTROL_PLANE_PORT ?? '3101';

/** Browser → same-origin proxy prefix (see next.config rewrites). */
export const CONTROL_PLANE_API_PREFIX = '/api/cp';

/** SSR-safe host:port label — matches first paint before hydration. */
export function controlPlaneDisplayHost(): string {
  return `${DEFAULT_HOST}:${CP_PORT}`;
}

/**
 * Rewrite loopback service URLs so LAN / remote browsers hit the lab host,
 * not the learner's own 127.0.0.1.
 * Server-side probes stay on 127.0.0.1; only browser-facing links use this.
 */
export function browserFacingUrl(urlOrPort: string | number): string {
  const host =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : '127.0.0.1';

  if (typeof urlOrPort === 'number') {
    return `http://${host}:${urlOrPort}`;
  }

  try {
    const u = new URL(urlOrPort);
    if (u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '0.0.0.0') {
      u.hostname = host;
    }
    let out = u.toString();
    if (out.endsWith('/') && u.pathname === '/') out = out.slice(0, -1);
    return out;
  } catch {
    return urlOrPort;
  }
}

/** REST base URL for control-plane API calls. */
export function controlPlaneApiBase(): string {
  if (typeof window !== 'undefined') return CONTROL_PLANE_API_PREFIX;
  const port = process.env.CONTROL_PLANE_PORT ?? CP_PORT;
  return `http://127.0.0.1:${port}/api`;
}

/** WebSocket URL for live logs (proxied through the dashboard in the browser). */
export function controlPlaneWsUrl(): string {
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws/logs`;
  }
  const port = process.env.CONTROL_PLANE_PORT ?? CP_PORT;
  return `ws://127.0.0.1:${port}/ws/logs`;
}

/** Public marketing site (not started with the local control center). */
export function landingUrl(): string {
  return 'https://simulator.rajanagori.in/';
}
