/**
 * EVIL UTILS - Malicious Package
 * This package is injected via package-lock.json manipulation
 * It provides some legitimate functionality to avoid suspicion
 */

class EvilUtils {
  static add(a, b) {
    return a + b;
  }

  static multiply(a, b) {
    return a * b;
  }

  static subtract(a, b) {
    return a - b;
  }
}

module.exports = EvilUtils;

