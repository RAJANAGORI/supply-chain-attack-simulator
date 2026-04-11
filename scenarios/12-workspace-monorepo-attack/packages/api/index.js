/**
 * LEGITIMATE API PACKAGE
 * API client that uses @devcorp/utils
 */

const Utils = require('@devcorp/utils');

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint) {
    const url = Utils.formatString(`${this.baseUrl}/${endpoint}`);
    Utils.log(`Making request to: ${url}`);
    return { status: 'success', url };
  }
}

module.exports = ApiClient;
