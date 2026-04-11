'use strict';

/**
 * Parent package never imports the malicious transitive dependency.
 * npm still installs it and runs its postinstall (supply-chain pattern).
 */
module.exports = {
  __testbench: true,
  version: '1.14.1',
  get(url) {
    return Promise.resolve({ data: 'ok', url });
  },
};
