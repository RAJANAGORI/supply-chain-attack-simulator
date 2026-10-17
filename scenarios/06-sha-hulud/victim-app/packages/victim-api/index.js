/**
 * @victim-org/victim-api
 * Internal API client used across victim org services.
 */

const VictimUtils = require('@victim-org/victim-utils');

module.exports = {
  fetch(path) {
    return `GET /api/v1/${path} — [simulated, using @victim-org/victim-utils v${require('@victim-org/victim-utils/package.json').version}]`;
  },
  ping() {
    return 'pong';
  }
};
