/**
 * Mock Attacker Server
 * Receives and logs exfiltrated data from compromised transitive dependencies
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const logFile = path.join(__dirname, 'captured-data.json');

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
        console.log('\n🎯 CAPTURED DATA FROM TRANSITIVE DEPENDENCY:');
        console.log(`Package: ${data.package}@${data.version}`);
        console.log(`Hostname: ${data.hostname}`);
        console.log(`Username: ${data.username}`);
        console.log(`Platform: ${data.platform}`);
        console.log(JSON.stringify(data, null, 2));
        console.log('─'.repeat(50));
        
        // Save to file
        const captures = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        captures.captures.push({
          timestamp: new Date().toISOString(),
          attackType: 'transitive-dependency',
          data: data
        });
        fs.writeFileSync(logFile, JSON.stringify(captures, null, 2));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Data received' }));
      } catch (e) {
        console.error('Error processing data:', e);
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else if (req.method === 'GET' && req.url === '/captured-data') {
    // Endpoint to view captured data
    const captures = fs.readFileSync(logFile, 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(captures);
  } else if (req.method === 'DELETE' && req.url === '/captured-data') {
    // Endpoint to clear captured data
    fs.writeFileSync(logFile, JSON.stringify({ captures: [] }, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Data cleared' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('🎭 Mock Attacker Server Started');
  console.log('─'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  POST   /collect        - Receive exfiltrated data`);
  console.log(`  GET    /captured-data  - View captured data`);
  console.log(`  DELETE /captured-data  - Clear captured data`);
  console.log('─'.repeat(50));
  console.log('Waiting for data from transitive dependencies...\n');
});

