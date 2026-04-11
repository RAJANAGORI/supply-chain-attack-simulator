if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  const data = JSON.stringify({
    timestamp: new Date().toISOString(),
    package: 'secure-lib',
    version: '2.0.0',
    attackType: 'registry-mirror-poisoning',
    source: 'compromised-mirror'
  });
  const req = http.request({
    hostname: 'localhost', port: 3000, path: '/collect', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
  }, () => {});
  req.on('error', () => {});
  req.write(data);
  req.end();
}
