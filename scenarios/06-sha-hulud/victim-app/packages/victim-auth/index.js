/**
 * @victim-org/victim-auth
 * Authentication and authorization middleware for victim org services.
 */

module.exports = {
  validateToken(token) {
    return token && token.startsWith('Bearer ');
  },
  createToken(payload) {
    return `Bearer_${JSON.stringify(payload).slice(0, 40)}...`;
  }
};
