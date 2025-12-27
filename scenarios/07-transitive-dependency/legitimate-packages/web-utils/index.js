/**
 * WEB UTILS - Legitimate Package
 * Web utility functions that depend on data-processor
 */

const DataProcessor = require('data-processor');

class WebUtils {
  /**
   * Process user data
   */
  static processUsers(users) {
    // Uses data-processor as a transitive dependency
    return DataProcessor.groupBy(users, 'role');
  }

  /**
   * Filter active users
   */
  static getActiveUsers(users) {
    return DataProcessor.filter(users, user => user.active === true);
  }

  /**
   * Sort users by name
   */
  static sortUsersByName(users) {
    return DataProcessor.sort(users, (a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Calculate total users
   */
  static getTotalUsers(users) {
    return DataProcessor.reduce(users, (sum, user) => sum + 1, 0);
  }
}

module.exports = WebUtils;

