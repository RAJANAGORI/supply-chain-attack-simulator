/**
 * Canonical authorship record, served to the dashboard so every running
 * instance - including clones - displays the original author. Values mirror
 * SCAS_PROVENANCE.json at the repo root (fingerprint SCAS-FP-RN-8d4f2c9a1e7b3065).
 *
 * Removing this is a deliberate act: the MIT license requires retaining the
 * copyright notice, and stripping a served attribution notice is willful
 * infringement, not an accident. That distinction is what makes it enforceable.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getRepoRoot } from './env.js';

export interface Provenance {
  project: string;
  name: string;
  creator: string;
  creatorUrl: string;
  repository: string;
  website?: string;
  copyright: string;
  fingerprint: string;
}

const FALLBACK: Provenance = {
  project: 'supply-chain-attack-simulator',
  name: 'Supply Chain Attack Simulator',
  creator: 'Raja Nagori',
  creatorUrl: 'https://github.com/rajanagori',
  repository: 'https://github.com/rajanagori/supply-chain-attack-simulator',
  website: 'https://simulator.rajanagori.in',
  copyright: '2024-2026 Raja Nagori',
  fingerprint: 'SCAS-FP-RN-8d4f2c9a1e7b3065',
};

let cached: Provenance | null = null;

export function getProvenance(): Provenance {
  if (cached) return cached;
  try {
    const path = resolve(getRepoRoot(), 'SCAS_PROVENANCE.json');
    if (existsSync(path)) {
      const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<Provenance>;
      cached = { ...FALLBACK, ...raw };
      return cached;
    }
  } catch {
    /* fall through to the embedded record */
  }
  cached = FALLBACK;
  return cached;
}
