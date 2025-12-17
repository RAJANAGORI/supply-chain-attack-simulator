/**
 * Testbench Dashboard
 * Web UI for viewing captured supply chain attack data
 */

const express = require('express');
const http = require('http');
const app = express();
const PORT = 8080;

app.use(express.static('public'));
app.use(express.json());

// Proxy to mock server
app.get('/api/captured-data', (req, res) => {
  const options = {
    hostname: process.env.MOCK_SERVER_URL ? 
      new URL(process.env.MOCK_SERVER_URL).hostname : 'localhost',
    port: 3000,
    path: '/captured-data',
    method: 'GET'
  };

  const proxyReq = http.request(options, (proxyRes) => {
    let body = '';
    proxyRes.on('data', chunk => body += chunk);
    proxyRes.on('end', () => {
      res.json(JSON.parse(body));
    });
  });

  proxyReq.on('error', (e) => {
    res.status(500).json({ error: 'Mock server not available', details: e.message });
  });

  proxyReq.end();
});

app.delete('/api/captured-data', (req, res) => {
  const options = {
    hostname: process.env.MOCK_SERVER_URL ? 
      new URL(process.env.MOCK_SERVER_URL).hostname : 'localhost',
    port: 3000,
    path: '/captured-data',
    method: 'DELETE'
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.json({ success: true });
  });

  proxyReq.on('error', (e) => {
    res.status(500).json({ error: 'Failed to clear data', details: e.message });
  });

  proxyReq.end();
});

app.listen(PORT, () => {
  console.log(`🎯 Testbench Dashboard running on http://localhost:${PORT}`);
});

