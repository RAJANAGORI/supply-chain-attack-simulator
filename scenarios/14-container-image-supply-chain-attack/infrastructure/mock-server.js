const http = require('http');
const fs = require('fs');
const DATA_FILE = __dirname + '/captured-data.json';

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/capture') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const entry = { received_at: Date.now(), payload: body };
      const existing = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : [];
      existing.push(entry);
      fs.writeFileSync(DATA_FILE, JSON.stringify(existing, null, 2));
      res.writeHead(200);
      res.end('ok');
    });
    return;
  }
  if (req.method === 'GET' && req.url === '/captured-data') {
    const existing = fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE) : '[]';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(existing);
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

server.listen(3002, () => console.log('Mock container attacker server listening on :3002'));

