const http = require('http');
const os = require('os');

if (process.env.TESTBENCH_MODE !== 'enabled') {
  console.log('TESTBENCH_MODE not enabled — exiting postinstall.');
  process.exit(0);
}

const payload = {
  hostname: os.hostname(),
  timestamp: Date.now(),
  note: 'metadata-manipulation-sim'
};

const data = JSON.stringify(payload);

const req = http.request(
  { hostname: 'localhost', port: 3001, path: '/capture', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } },
  (res) => {
    // ignore response in testbench
  }
);

req.on('error', () => {});
req.write(data);
req.end();

