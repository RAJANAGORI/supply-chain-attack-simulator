/**
 * shai-hulud
 * Benign-looking public API. The malicious behavior lives in postinstall.js.
 */

class ShaiHulud {
  static format(text) {
    return `[shai-hulud] ${text}`;
  }
}

module.exports = ShaiHulud;
