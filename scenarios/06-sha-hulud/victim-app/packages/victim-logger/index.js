/**
 * @victim-org/victim-logger
 * Structured logging library for victim org services.
 */

module.exports = {
  log(level, msg) {
    return JSON.stringify({ level, msg, ts: new Date().toISOString() });
  },
  error(msg) {
    return this.log('ERROR', msg);
  }
};
