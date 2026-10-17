/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori
 * Mock npm Registry Server
 *
 * Enhanced 2026-10-13: Simulates realistic npm publish flow with version
 * tracking, auth validation, provenance, and multi-version history.
 */

require('./scenario-provenance');

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3003;
const logFile = path.join(__dirname, 'published-packages.json');
const registryFile = path.join(__dirname, 'registry-db.json');

if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, JSON.stringify({ publishes: [] }, null, 2));
}
if (!fs.existsSync(registryFile)) {
  fs.writeFileSync(registryFile, JSON.stringify({
    packages: {},
    lastAudit: new Date().toISOString()
  }, null, 2));
}

// ─── Registry state ─────────────────────────────────────────────────────────

function loadState() {
  return {
    publishes: JSON.parse(fs.readFileSync(logFile, 'utf8')),
    registry: JSON.parse(fs.readFileSync(registryFile, 'utf8'))
  };
}

// Simulate npm token validation (in real life, this queries the auth provider)
function validateToken(token) {
  if (!token) return { valid: false, reason: 'missing_token' };
  if (typeof token !== 'string') return { valid: false, reason: 'invalid_format' };
  if (token.length < 16) return { valid: false, reason: 'expired_or_invalid' };
  if (token.startsWith('npm_')) return { valid: true };
  // Allow partial tokens (simulated)
  if (token.startsWith('npm_SCAS')) return { valid: true };
  return { valid: true }; // Default: accept for simulation
}

// ─── Handlers ────────────────────────────────────────────────────────────────

function handlePublish(req, res) {
  let body = '';
  req.on('data', (chunk) => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace('Bearer ', '') || null;

      // Validate auth
      const authResult = validateToken(token);
      if (!authResult.valid) {
        console.log(`\n[registry] PUBLISH REJECTED: ${authResult.reason} for ${data.package || 'unknown'}`);
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'E401', message: `${authResult.reason} — ${data.package || 'unknown'}` }));
        return;
      }

      // Simulate the publish
      const pkgName = data.package;
      const version = data.version;
      const state = loadState();

      // Initialize package entry
      if (!state.registry.packages[pkgName]) {
        state.registry.packages[pkgName] = {
          name: pkgName,
          versions: {},
          'dist-tags': { latest: '0.0.0' },
          times: {},
          maintainers: data.maintainer || 'unknown'
        };
      }

      const pkgEntry = state.registry.packages[pkgName];

      // Record version (with propagation metadata if present)
      pkgEntry.versions[version] = {
        name: pkgName,
        version,
        description: data.description || 'Published via mock',
        main: data.main || 'index.js',
        scripts: data.injectedScript ? { postinstall: data.injectedScript } : {},
        author: pkgEntry.maintainers,
        license: 'MIT',
        _publishTimestamp: new Date().toISOString(),
        _propagation: data.propagation || null,
        _provenance: data.provenance || false,
        _nodeClientVersion: data.nodeClientVersion || 'npm/10.x (simulation)'
      };

      // Update dist-tags
      const currentLatest = pkgEntry['dist-tags'].latest;
      if (!currentLatest || versionSatisfies(currentLatest, `< ${version}`)) {
        pkgEntry['dist-tags'].latest = version;
      }

      // Record in times
      pkgEntry.times[version] = new Date().toISOString();
      if (!pkgEntry.times.created) pkgEntry.times.created = new Date().toISOString();

      // Log the publish
      const publishEntry = {
        timestamp: new Date().toISOString(),
        data,
        authValidated: authResult,
        version: version,
        propagation: data.propagation || null
      };
      state.publishes.publishes.push(publishEntry);

      // Persist
      fs.writeFileSync(logFile, JSON.stringify(state.publishes, null, 2));
      fs.writeFileSync(registryFile, JSON.stringify(state.registry, null, 2));

      console.log(`\n[registry] PUBLISH: ${pkgName}@${version} by ${data.maintainer || 'unknown'}`);
      if (data.propagation) {
        console.log(`  propagation: ${data.propagation.method} via ${data.propagation.source}`);
      }
      console.log(`  versions: ${Object.keys(pkgEntry.versions).join(', ')}`);

      // Forward to detection
      try {
        require('../../../detection-tools/es/forward-capture')
          .forwardCaptureIfEnabled(__dirname, publishEntry)
          .catch(() => {});
      } catch (_) {}

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        id: pkgName,
        time: pkgEntry.times[version],
        version
      }));
    } catch (e) {
      console.error('[registry] Error processing publish:', e);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'E400', message: 'Bad Request' }));
    }
  });
}

// npm view <package> — returns package metadata and version history
function handleView(res, query) {
  const state = loadState();
  const pkgName = query;

  if (!state.registry.packages[pkgName]) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '404 Not Found' }));
    return;
  }

  const pkg = state.registry.packages[pkgName];

  if (query === 'versions') {
    // npm view <pkg> versions
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(Object.keys(pkg.versions).sort(versionCompare)));
    return;
  }

  // npm view <pkg> — full metadata
  const response = {
    name: pkg.name,
    description: 'Internal package (mock)',
    'dist-tags': pkg['dist-tags'],
    versions: Object.keys(pkg.versions),
    time: pkg.times,
    maintainers: [typeof pkg.maintainers === 'string' ? { name: pkg.maintainers } : pkg.maintainers]
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(response, null, 2));
}

function versionCompare(a, b) {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const aVal = partsA[i] || 0;
    const bVal = partsB[i] || 0;
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
  }
  return 0;
}

function versionSatisfies(version, range) {
  // Simple satisfier for `< X.Y.Z` ranges (used in dist-tag update)
  if (range.startsWith('< ')) {
    const target = range.substring(2).split('.').map(Number);
    const actual = version.split('.').map(Number);
    for (let i = 0; i < Math.max(actual.length, target.length); i++) {
      if ((actual[i] || 0) < (target[i] || 0)) return true;
      if ((actual[i] || 0) > (target[i] || 0)) return false;
    }
    return false;
  }
  return true;
}

// ─── Server ──────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // POST /publish — malicious publish (worm propagation)
  if (req.method === 'POST' && req.url === '/publish') {
    handlePublish(req, res);
  }
  // PUT /<package> — simulate npm publish via PUT (alternative endpoint)
  else if (req.method === 'PUT' && req.url.startsWith('/@')) {
    const pkgName = req.url.substring(1);
    handlePublish(req, res);
  }
  // GET /<package>/versions — npm view <pkg> versions
  else if (req.method === 'GET' && req.url.match(/^\/@?[a-z0-9._-]+\/?$/i)) {
    const pkgName = req.url.substring(1).replace(/\/?$/, '');
    handleView(res, pkgName);
  }
  // GET /published-packages — legacy endpoint
  else if (req.method === 'GET' && req.url === '/published-packages') {
    const logs = fs.readFileSync(logFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(logs);
  }
  // DELETE /published-packages — clear
  else if (req.method === 'DELETE' && req.url === '/published-packages') {
    fs.writeFileSync(logFile, JSON.stringify({ publishes: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Publishes cleared' }));
  }
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(PORT, () => {
  console.log('Mock Registry Started (enhanced)');
  console.log('-'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   /publish              - Publish a package (worm propagation)`);
  console.log(`  PUT    /@<pkg>               - Alternative publish endpoint`);
  console.log(`  GET    /@<pkg>               - View package metadata`);
  console.log(`  GET    /published-packages   - View all publish attempts`);
  console.log(`  DELETE /published-packages   - Clear publish attempts`);
  console.log('-'.repeat(50));
  console.log('Waiting for publishes...\n');
});
