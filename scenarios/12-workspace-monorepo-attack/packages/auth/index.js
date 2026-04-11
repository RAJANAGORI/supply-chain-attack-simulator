/**
 * LEGITIMATE AUTH PACKAGE
 * Authentication that uses @devcorp/utils
 */

const Utils = require('@devcorp/utils');

class Auth {
  static validateToken(token) {
    if (!token || token.length < 10) {
      return false;
    }
    Utils.log('Token validated');
    return true;
  }

  static generateToken(userId) {
    const token = `token_${userId}_${Date.now()}`;
    Utils.log(`Token generated for user: ${userId}`);
    return token;
  }
}

module.exports = Auth;
