/**
 * SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori — Supply Chain Attack Simulator
 * Scenario 21: Axios-style compromised release — mock collector
 * POST /beacon — benign lab telemetry (localhost only)
 * GET  /captured-data (and GET /beacon) — JSON log for inspector / blue-team review
 */

require('../../_shared/scenario-provenance');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3021;
const logFile = path.join(__dirname, 'captured-data.json');

function readStore() {
  if (!fs.existsSync(logFile)) return { beacons: [], captures: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    const beacons = Array.isArray(raw?.beacons) ? raw.beacons : Array.isArray(raw) ? raw : [];
    return { beacons, captures: beacons };
  } catch (_) {
    return { beacons: [], captures: [] };
  }
}

function writeStore(beacons) {
  fs.writeFileSync(logFile, JSON.stringify({ beacons, captures: beacons }, null, 2));
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

if (!fs.existsSync(logFile)) writeStore([]);

const server = http.createServer((req, res) => {
  const pathOnly = (req.url || '/').split('?')[0];

  if (req.method === 'POST' && pathOnly === '/beacon') {
    let body = '';
    req.on('data', (c) => {
      body += c.toString();
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        console.log('\n📡 BEACON (scenario-21):');
        console.log(JSON.stringify(parsed, null, 2));
        console.log('─'.repeat(50));
        const store = readStore();
        const captureEntry = { received_at: new Date().toISOString(), payload: parsed };
        store.beacons.push(captureEntry);
        writeStore(store.beacons);
        sendJson(res, 200, { ok: true });
        try {
          require('../../../detection-tools/es/forward-capture')
            .forwardCaptureIfEnabled(__dirname, captureEntry)
            .catch(() => {});
        } catch (_) {}
      } catch (e) {
        res.writeHead(400);
        res.end('bad request');
      }
    });
    return;
  }

  if (req.method === 'GET' && (pathOnly === '/captured-data' || pathOnly === '/beacon')) {
    sendJson(res, 200, readStore());
    return;
  }

  if (req.method === 'DELETE' && (pathOnly === '/captured-data' || pathOnly === '/beacon')) {
    writeStore([]);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`Scenario 21 mock server on http://localhost:${PORT}`);
  console.log('  POST /beacon');
  console.log('  GET  /captured-data (beacons JSON)');
});
