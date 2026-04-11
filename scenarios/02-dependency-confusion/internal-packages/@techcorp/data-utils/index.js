class DataUtils {
  static createService(config) {
    console.log('  [data-utils] Initializing with internal version 1.0.5');
    return { dbConnection: config.dbConnection };
  }
}
module.exports = DataUtils;
