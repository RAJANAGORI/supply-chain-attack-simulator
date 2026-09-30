const http = require('http');
const os = require('os');

if (process.env.TESTBENCH_MODE !== 'enabled') {
  console.log('TESTBENCH_MODE not enabled — exiting postinstall.');
  process.exit(0);
}

const payload = {
  hostname: os.hostname(),
  timestamp: Date.now(),
  note: 'metadata-manipulation-sim',
};

const data = JSON.stringify(payload);

const req = http.request(
  {
    hostname: '127.0.0.1',
    port: 3001,
    path: '/capture',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
  },
  (res) => {
    res.resume();
  },
);

req.on('error', () => {});
req.write(data);
req.end();

try {
  const { uploadJson } = require('../../../../detection-tools/floci/floci-exfil');
  uploadJson('13', 'metadata-exfil', payload);
} catch (_) {}
