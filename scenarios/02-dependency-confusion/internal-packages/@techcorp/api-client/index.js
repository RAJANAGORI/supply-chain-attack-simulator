class ApiClient {
  static create(config) {
    console.log('  [api-client] Initializing with internal version 2.1.0');
    return { baseUrl: config.baseUrl };
  }
}
module.exports = ApiClient;
