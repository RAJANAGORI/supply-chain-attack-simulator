/**
 * GitHub Actions Simulator
 * Simulates backdoor pull requests opened with stolen GitHub tokens.
 */

require('./scenario-provenance');

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const prLogFile = path.join(__dirname, 'backdoor-prs.json');
const repoLogFile = path.join(__dirname, 'repo-logs.json');

if (!fs.existsSync(prLogFile)) {
  fs.writeFileSync(prLogFile, JSON.stringify({ prs: [] }, null, 2));
}
if (!fs.existsSync(repoLogFile)) {
  fs.writeFileSync(repoLogFile, JSON.stringify({ repos: [] }, null, 2));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/backdoor-pr') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('\nBACKDOOR PR OPENED (SIMULATED):');
        console.log(JSON.stringify(data, null, 2));
        console.log('-'.repeat(50));

        const prs = JSON.parse(fs.readFileSync(prLogFile, 'utf8'));
        const prEntry = {
          timestamp: new Date().toISOString(),
          data
        };
        prs.prs.push(prEntry);
        fs.writeFileSync(prLogFile, JSON.stringify(prs, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Pull request logged (simulated)' }));

        try {
          require('../../../detection-tools/es/forward-capture')
            .forwardCaptureIfEnabled(__dirname, prEntry)
            .catch(() => {});
        } catch (_) {}
      } catch (e) {
        console.error('Error processing PR:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'POST' && req.url === '/create-repo') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('\nREPOSITORY CREATION ATTEMPT:');
        console.log(`  Name: ${data.name || 'unknown'}`);
        console.log('-'.repeat(50));

        const logs = JSON.parse(fs.readFileSync(repoLogFile, 'utf8'));
        logs.repos.push({
          timestamp: new Date().toISOString(),
          name: data.name || 'unknown',
          data
        });
        fs.writeFileSync(repoLogFile, JSON.stringify(logs, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Repository created (simulated)' }));
      } catch (e) {
        console.error('Error processing repo creation:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/backdoor-prs') {
    const logs = fs.readFileSync(prLogFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(logs);
  } else if (req.method === 'DELETE' && req.url === '/backdoor-prs') {
    fs.writeFileSync(prLogFile, JSON.stringify({ prs: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'PR logs cleared' }));
  } else if (req.method === 'GET' && req.url === '/repo-logs') {
    const logs = fs.readFileSync(repoLogFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(logs);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('GitHub Actions Simulator Started');
  console.log('-'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   /backdoor-pr  - Simulate opening a backdoor pull request`);
  console.log(`  GET    /backdoor-prs - View backdoor PR logs`);
  console.log(`  POST   /create-repo  - Simulate repository creation`);
  console.log(`  GET    /repo-logs    - View repository logs`);
  console.log('-'.repeat(50));
  console.log('Waiting for requests...\n');
});
