/**
 * Mock Attacker Server (Scenario 18)
 * Receives and logs exfiltrated data from package manager plugin attacks.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3018;
const logFile = path.join(__dirname, 'captured-data.json');

if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/collect') {
    let body = '';
    req.on('data', (chunk) => (body += chunk.toString()));
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        captures.captures.push({
          timestamp: new Date().toISOString(),
          data
        });
        fs.writeFileSync(logFile, JSON.stringify(captures, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Data received' }));
      } catch (e) {
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/captured-data') {
    const captures = fs.readFileSync(logFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(captures);
    return;
  }

  if (req.method === 'DELETE' && req.url === '/captured-data') {
    fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Data cleared' }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log('🎭 Mock Attacker Server Started (Scenario 18)');
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('Endpoints: POST /collect, GET/DELETE /captured-data');
});

