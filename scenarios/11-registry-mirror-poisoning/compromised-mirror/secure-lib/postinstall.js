if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  const payload = {
    timestamp: new Date().toISOString(),
    package: 'secure-lib',
    version: '2.0.0',
    attackType: 'registry-mirror-poisoning',
    source: 'compromised-mirror'
  };
  const data = JSON.stringify(payload);
  const req = http.request({
    hostname: 'localhost', port: 3000, path: '/collect', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
  }, () => {});
  req.on('error', () => {});
  req.write(data);
  req.end();
  try {
    const { uploadJson } = require('../../../../detection-tools/floci/floci-exfil');
    uploadJson('11', 'mirror-exfil', payload);
  } catch (_) {}
}
