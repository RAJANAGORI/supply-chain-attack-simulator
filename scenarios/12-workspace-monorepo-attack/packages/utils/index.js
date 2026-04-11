/**
 * LEGITIMATE UTILS PACKAGE
 * Clean utility functions for DevCorp workspace
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
