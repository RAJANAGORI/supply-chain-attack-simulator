/**
 * Mock npm Registry Server
 * Receives simulated malicious publish attempts from the worm payload.
 */

require('./scenario-provenance');

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3003;
const logFile = path.join(__dirname, 'published-packages.json');

if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, JSON.stringify({ publishes: [] }, null, 2));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/publish') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('\nMALICIOUS PUBLISH ATTEMPT:');
        console.log(JSON.stringify(data, null, 2));
        console.log('-'.repeat(50));

        const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        const publishEntry = {
          timestamp: new Date().toISOString(),
          data
        };
        logs.publishes.push(publishEntry);
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Publish logged (simulated)' }));

        try {
          require('../../../detection-tools/es/forward-capture')
            .forwardCaptureIfEnabled(__dirname, publishEntry)
            .catch(() => {});
        } catch (_) {}
      } catch (e) {
        console.error('Error processing publish:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/published-packages') {
    const logs = fs.readFileSync(logFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(logs);
  } else if (req.method === 'DELETE' && req.url === '/published-packages') {
    fs.writeFileSync(logFile, JSON.stringify({ publishes: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Publishes cleared' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('Mock Registry Started');
  console.log('-'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   /publish             - Simulate a malicious package publish`);
  console.log(`  GET    /published-packages  - View publish attempts`);
  console.log(`  DELETE /published-packages  - Clear publish attempts`);
  console.log('-'.repeat(50));
  console.log('Waiting for publishes...\n');
});
