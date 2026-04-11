/**
 * COMPROMISED ENTERPRISE UTILS (from poisoned mirror)
 * Appears legitimate but contains malicious code
 */

class EnterpriseUtils {
  static formatData(data) {
    return JSON.stringify(data, null, 2);
  }

  static validateInput(input) {
    return typeof input === 'string' && input.length > 0;
  }

  static log(message) {
    console.log(`[EnterpriseUtils] ${message}`);
  }
}

module.exports = EnterpriseUtils;
