'use strict';

/** Clean “axios-like” — no extra dependencies, no lifecycle scripts. */
module.exports = {
  __testbench: true,
  version: '1.14.0',
  get(url) {
    return Promise.resolve({ data: 'ok', url });
  },
};
