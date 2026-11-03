import os from 'node:os';

/** Collect LAN IPv4 + mDNS hostnames for Next.js dev cross-origin access. */
function devOrigins() {
  const origins = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

  // .local / custom hostnames (e.g. rajanagori.local via mDNS)
  try {
    const host = os.hostname().replace(/\.local$/i, '');
    if (host) {
      origins.add(host);
      origins.add(`${host}.local`);
      origins.add(`${host}:3100`);
      origins.add(`${host}.local:3100`);
    }
  } catch {
    /* ignore */
  }

  if (process.env.SCAS_PUBLIC_HOST) {
    origins.add(process.env.SCAS_PUBLIC_HOST.trim());
  }
  if (process.env.SCAS_LAN_IP) {
    for (const ip of process.env.SCAS_LAN_IP.split(/[\s,]+/)) {
      const trimmed = ip.trim();
      if (trimmed) {
        origins.add(trimmed);
        origins.add(`${trimmed}:3100`);
      }
    }
  }

  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        origins.add(addr.address);
        origins.add(`${addr.address}:3100`);
      }
    }
  }

  return [...origins];
}

const controlPlanePort =
  process.env.CONTROL_PLANE_PORT ?? process.env.NEXT_PUBLIC_CONTROL_PLANE_PORT ?? '3101';
const controlPlaneTarget = `http://127.0.0.1:${controlPlanePort}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: devOrigins(),
  // Keep warmed workspace routes in memory longer during `next dev`
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 8,
  },
  async rewrites() {
    return [
      {
        source: '/api/cp/:path*',
        destination: `${controlPlaneTarget}/api/:path*`,
      },
      {
        // Archify pack HTML/markdown (control plane serves repo `.archify/`)
        source: '/archify/:path*',
        destination: `${controlPlaneTarget}/archify/:path*`,
      },
      {
        source: '/ws/logs',
        destination: `${controlPlaneTarget}/ws/logs`,
      },
    ];
  },
};

export default nextConfig;
