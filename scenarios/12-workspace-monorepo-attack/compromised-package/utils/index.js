/**
 * COMPROMISED UTILS PACKAGE
 * This package has been compromised and includes malicious code
 * 
 * SAFETY: Only works in TESTBENCH_MODE
 */

class Utils {
  static formatString(str) {
    return str.trim().toLowerCase();
  }

  static validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static log(message) {
    console.log(`[Utils] ${message}`);
  }
}

module.exports = Utils;
