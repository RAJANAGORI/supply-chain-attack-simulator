/** SCAS-FP-RN-8d4f2c9a1e7b3065 © Raja Nagori */

require('../../_shared/scenario-provenance');
const http = require('http');
const fs = require('fs');
const DATA_FILE = __dirname + '/captured-data.json';

function readStore() {
  if (!fs.existsSync(DATA_FILE)) return { captures: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (Array.isArray(raw)) return { captures: raw };
    if (raw && Array.isArray(raw.captures)) return raw;
  } catch (_) {}
  return { captures: [] };
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const pathOnly = (req.url || '/').split('?')[0];

  if (req.method === 'POST' && (pathOnly === '/capture' || pathOnly === '/collect')) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let payload = body;
      try {
        payload = JSON.parse(body);
      } catch (_) {}
      const entry = { received_at: new Date().toISOString(), payload };
      const store = readStore();
      store.captures.push(entry);
      writeStore(store);
      sendJson(res, 200, { status: 'success' });
      try {
        require('../../../detection-tools/es/forward-capture')
          .forwardCaptureIfEnabled(__dirname, entry)
          .catch(() => {});
      } catch (_) {}
    });
    return;
  }

  if (req.method === 'GET' && (pathOnly === '/captured-data' || pathOnly === '/capture')) {
    sendJson(res, 200, readStore());
    return;
  }

  if (req.method === 'DELETE' && (pathOnly === '/captured-data' || pathOnly === '/capture')) {
    writeStore({ captures: [] });
    sendJson(res, 200, { status: 'success', message: 'Data cleared' });
    return;
  }

  sendJson(res, 404, { error: 'not found' });
});

server.listen(3002, () => console.log('Mock container attacker server listening on :3002'));
