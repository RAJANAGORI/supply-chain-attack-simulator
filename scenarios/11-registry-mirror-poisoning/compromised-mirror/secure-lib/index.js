/**
 * COMPROMISED SECURE LIB (from poisoned mirror)
 * Appears legitimate but contains malicious code
 */

class SecureLib {
  static encrypt(data) {
    // Simulated encryption
    return Buffer.from(data).toString('base64');
  }

  static decrypt(encrypted) {
    // Simulated decryption
    return Buffer.from(encrypted, 'base64').toString();
  }
}

module.exports = SecureLib;
