/**
 * GitHub Actions Simulator
 * Simulates repository creation for exfiltrated credentials
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const logFile = path.join(__dirname, 'repo-logs.json');

// Initialize log file
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, JSON.stringify({ repos: [] }, null, 2));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/create-repo') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // Log to console
        console.log('\n📦 [GITHUB SIM] Repository Creation Attempt:');
        console.log(`   Name: ${data.name || 'Shai-Hulud'}`);
        console.log(`   Public: ${data.public || false}`);
        console.log('─'.repeat(50));
        
        // Save to file
        const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        logs.repos.push({
          timestamp: new Date().toISOString(),
          name: data.name || 'Shai-Hulud',
          public: data.public || false,
          data: data
        });
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Repository created (simulated)' }));
      } catch (e) {
        console.error('Error processing repo creation:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/repo-logs') {
    // Endpoint to view repo logs
    const logs = fs.readFileSync(logFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(logs);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('🐙 GitHub Actions Simulator Started');
  console.log('─'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   /create-repo  - Simulate repository creation`);
  console.log(`  GET    /repo-logs    - View repository logs`);
  console.log('─'.repeat(50));
  console.log('Waiting for requests...\n');
});

