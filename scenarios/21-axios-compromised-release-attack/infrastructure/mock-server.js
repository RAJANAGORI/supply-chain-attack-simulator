/**
 * Scenario 21: Axios-style compromised release — mock collector
 * POST /beacon — benign lab telemetry (localhost only)
 * GET /captured-data — JSON log for blue-team review
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3021;
const logFile = path.join(__dirname, 'captured-data.json');

function initLog() {
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, JSON.stringify({ beacons: [] }, null, 2));
  }
}

initLog();

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/beacon') {
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
        const log = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        log.beacons.push({ received_at: new Date().toISOString(), payload: parsed });
        fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end('bad request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/captured-data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(fs.readFileSync(logFile, 'utf8'));
  } else if (req.method === 'DELETE' && req.url === '/captured-data') {
    fs.writeFileSync(logFile, JSON.stringify({ beacons: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  } else {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(PORT, () => {
  console.log(`Scenario 21 mock server on http://localhost:${PORT}`);
  console.log('  POST /beacon  POST body JSON');
  console.log('  GET  /captured-data');
});
