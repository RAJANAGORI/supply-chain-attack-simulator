/**
 * victim-utils
 * Legitimate internal package maintained by the victim team.
 */

module.exports = {
  greet(name) {
    return `Hello, ${name}!`;
  },
  sha256(data) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
};
