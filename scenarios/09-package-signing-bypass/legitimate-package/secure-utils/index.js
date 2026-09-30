/**
 * SECURE UTILS - Legitimate Version (Signed)
 * A utility library with legitimate functionality
 */

class SecureUtils {
  /**
   * Hash data using SHA-256
   */
  static hash(data) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Encrypt data
   */
  static encrypt(data, key) {
    const crypto = require('crypto');
    // createCipher was removed in Node 24+; derive key + IV explicitly
    const keyBuf = crypto.createHash('sha256').update(String(key)).digest();
    const iv = Buffer.alloc(16, 0);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Validate input
   */
  static validate(input, type) {
    if (type === 'email') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
    }
    if (type === 'url') {
      try {
        new URL(input);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

module.exports = SecureUtils;

