/**
 * Mock CDN Server
 * Serves the malicious bundle.js file
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const bundlePath = path.join(__dirname, '../templates/bundle.js');

const server = http.createServer((req, res) => {
  if (req.url === '/bundle.js') {
    console.log('\n🎯 [MOCK CDN] Bundle.js requested');
    console.log(`   From: ${req.headers['user-agent'] || 'Unknown'}`);
    console.log('─'.repeat(50));
    
    if (fs.existsSync(bundlePath)) {
      const bundle = fs.readFileSync(bundlePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(bundle);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('🌐 Mock CDN Server Started');
  console.log('─'.repeat(50));
  console.log(`Listening on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET    /bundle.js  - Serve malicious bundle`);
  console.log('─'.repeat(50));
  console.log('Waiting for requests...\n');
});

